import {
  DoubleSide,
  Intersection,
  Material,
  Mesh,
  Object3D,
  WebGLRenderer,
} from "three";
import {
  FeatureIdUniforms,
  FeatureInfo,
  buildOidToFeatureIdMap,
  getSplitMeshesFromTileOptimized,
  getTileMeshesByOid,
  queryFeatureFromIntersection,
} from "./utils";

import { TilesRenderer, Tile, TilesRendererEventMap } from "3d-tiles-renderer";

interface EngineData {
  scene: Object3D;
}

interface TileEx extends Tile {
  cached?: EngineData;
  engineData?: EngineData;
}

interface TilesRendererPlugin {
  name: string;
  init?: (tiles: TilesRenderer) => void;
  dispose?: () => void;
}

export class MaptalksTilerPlugin implements TilesRendererPlugin {
  name: string;
  private tiles?: TilesRenderer = undefined;
  private renderer: WebGLRenderer;
  private splitMeshCache: Map<string, Mesh[]> = new Map();
  private maxUniformVectors: number = 1024;
  private featureIdCount: number = 32;
  oids: number[] = [];

  constructor(params: { renderer: WebGLRenderer }) {
    this.name = "MAPTALKS_TILER_PLUGIN";
    this.renderer = params.renderer;
  }

  init(tiles: TilesRenderer) {
    this.tiles = tiles;

    this._updateWebGLLimits();

    tiles.addEventListener("load-model", this._onLoadModelCB);

    // initialize an already-loaded tiles
    tiles.traverse((tileObj) => {
      const tile = tileObj as Tile;
      const tileEx = tileObj as TileEx;
      if (tileEx.engineData?.scene) {
        this._onLoadModel(tileEx.engineData.scene, tile);
      } else if (tileEx.cached?.scene) {
        this._onLoadModel(tileEx.cached.scene, tile);
      }
      return true;
    }, null);
  }

  /**
   * Load model callback
   * @internal
   * @param scene Scene
   */
  _onLoadModelCB = ({ scene, tile }: TilesRendererEventMap["load-model"]) => {
    this._onLoadModel(scene, tile);
  };

  /**
   * Load model
   * @internal
   * @param scene Scene
   */
  _onLoadModel(scene: Object3D, tile: Tile) {
    this.splitMeshCache.clear();

    buildOidToFeatureIdMap(scene);
    scene.traverse((c) => {
      if (tile.content?.uri) {
        c.userData.tileURI = tile.content.uri;
      }
      if ((c as Mesh).material) {
        this._setupMaterial(c as Mesh);
      }
    });
  }

  /**
   * Update the WebGL limits
   * @internal
   */
  _updateWebGLLimits() {
    const gl = this.renderer.getContext();
    const maxVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    this.maxUniformVectors = maxVectors;
  }

  /**
   * Dynamically calculate FEATURE_ID_COUNT
   * Determine the most appropriate array size based on WebGL's MAX_FRAGMENT_UNIFORM_VECTORS limit and current oid array length
   * @internal
   * @returns The calculated FEATURE_ID_COUNT value
   * @throws Error When the required featureIdCount exceeds WebGL limits
   */
  _calculateFeatureIdCount(): number {
    const maxUniformVectors = this.maxUniformVectors;

    const currentOidCount = this.oids.length;

    if (currentOidCount > maxUniformVectors) {
      throw new Error(
        `The number of OIDs to hide (${currentOidCount}) exceeds the WebGL MAX_FRAGMENT_UNIFORM_VECTORS limit (${maxUniformVectors}).`
      );
    }

    const minFeatureIdCount = 32;

    if (currentOidCount <= minFeatureIdCount) {
      return minFeatureIdCount;
    }

    const powerOf2 = Math.ceil(Math.log2(currentOidCount));
    const featureIdCount = Math.pow(2, powerOf2);

    return featureIdCount;
  }

  /**
   * Set up shader modification for hiding specific features
   * This function encapsulates the logic of hiding specific featureIds by modifying the material shader through onBeforeCompile
   * @internal
   * @param material Three.js material object
   */
  _setupMaterial(mesh: Mesh) {
    const material = mesh.material as Material;

    material.side = DoubleSide;

    material.transparent = true;

    material.opacity = 0.5;

    const previousOnBeforeCompile = material.onBeforeCompile;

    // 确保material.defines存在
    if (!material.defines) {
      material.defines = {};
    }

    // 只在第一次设置时定义featureIdCount属性
    if (!material.defines.hasOwnProperty("FEATURE_ID_COUNT")) {
      // 在material上存储当前的featureIdCount，用于检测变化
      material.userData._materialFeatureIdCount = this.featureIdCount;

      Object.defineProperty(material.defines, "FEATURE_ID_COUNT", {
        get: () => {
          // 检测全局featureIdCount是否发生变化
          if (
            material.userData._materialFeatureIdCount !== this.featureIdCount
          ) {
            // featureIdCount发生变化，更新material上的记录
            material.userData._materialFeatureIdCount = this.featureIdCount;

            // 标记材质需要重新编译
            material.needsUpdate = true;
          }

          return material.userData._materialFeatureIdCount;
        },
        enumerable: true,
        configurable: true,
      });
    }

    material.onBeforeCompile = (shader, renderer) => {
      previousOnBeforeCompile?.call(material, shader, renderer);

      // Add uniform declaration
      shader.uniforms.hiddenFeatureIds = new FeatureIdUniforms(mesh, this);

      // Modify vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
             attribute float _feature_id_0;
             varying float vFeatureId;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
             vFeatureId = _feature_id_0;`
      );

      // Modify fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
             uniform float hiddenFeatureIds[FEATURE_ID_COUNT];
             varying float vFeatureId;
      
             bool shouldHideFeature(float featureId) {
               for(int i = 0; i < FEATURE_ID_COUNT; i++) {
                 if(abs(hiddenFeatureIds[i] - featureId) < 0.001) {
                   return true;
                 }
               }
               return false;
             }`
      );

      // Add discard logic at the beginning of the fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `void main() {
           if(shouldHideFeature(vFeatureId)) {
             discard;
           }`
      );
    };
  }

  /**
   * Query feature information from intersection
   * @param hit intersection
   * @returns feature information
   */
  queryFeatureFromIntersection(hit: Intersection): FeatureInfo {
    return queryFeatureFromIntersection(hit);
  }

  /**
   * Get mesh array by oid
   * @param oid oid
   * @returns corresponding mesh array
   */
  getMeshesByOid(oid: number): Mesh[] {
    const tileMeshes = getTileMeshesByOid(this.tiles!, oid);

    const allSplitMeshes: Mesh[] = [];

    for (const tileMesh of tileMeshes) {
      const cacheKey = `${oid}_${tileMesh.uuid}`;

      let splitMeshes = this.splitMeshCache.get(cacheKey);

      if (!splitMeshes) {
        // splitMeshes = getSplitMeshesFromTile(tileMesh, oid);
        splitMeshes = getSplitMeshesFromTileOptimized(tileMesh, oid);
        this.splitMeshCache.set(cacheKey, splitMeshes);
      }

      allSplitMeshes.push(...splitMeshes);
    }

    return allSplitMeshes;
  }

  /**
   * Hide the corresponding part of the original mesh according to the OID array
   * @param oids Array of OIDs to hide
   * @returns Number of meshes successfully applied shader
   */
  hideByOids(oids: number[]): void {
    this.oids = oids;
    this.featureIdCount = this._calculateFeatureIdCount();
  }

  /**
   * Restore the display of the corresponding mesh according to the OID array
   * @param oids Array of OIDs to restore
   */
  unhideByOids(oids: number[]): void {
    const oidSet = new Set(oids);
    const newOids = this.oids.filter((existingOid) => !oidSet.has(existingOid));
    this.oids = newOids;
    this.featureIdCount = this._calculateFeatureIdCount();
  }

  /**
   * Restore the original materials of the mesh
   */
  unhide(): void {
    this.oids = [];
    this.featureIdCount = this._calculateFeatureIdCount();
  }

  /**
   * Get the current feature ID count
   * @returns The current featureIdCount value
   */
  getFeatureIdCount(): number {
    return this.featureIdCount;
  }

  dispose() {
    const tiles = this.tiles;

    if (tiles) {
      tiles.removeEventListener("load-model", this._onLoadModelCB);
    }

    this.splitMeshCache.clear();
  }
}

// renderer传进来
// define用动态，通过Object.defineProperty(obj, {})实现,defines需要记录material，当值发生变化需要调用needsupdate
// https://github.com/NASA-AMMOS/3DTilesRendererJS/blob/51385e2d9d10574c84779f01388da99f2f9e0d23/src/plugins/three/fade/FadeBatchedMesh.js#L16
// 参考这个链接里面的实现方式
