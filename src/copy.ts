// import {
//     FeatureIdUniforms,
//     FeatureInfo,
//     buildOidToFeatureIdMap,
//     getSplitMeshesFromTile,
//     getTileMeshesByOid,
//     queryFeatureFromIntersection,
// } from "./utils";
// import { Intersection, Material, Mesh, Object3D } from "three";

// import { TilesRenderer } from "3d-tiles-renderer";

// export class MonomerMeshPlugin {
//     tiles: TilesRenderer | null = null;
//     oids: number[] = [];
//     private splitMeshCache: Map<string, Mesh[]> = new Map();
//     private maxUniformVectors: number = 512; // 默认值，将在运行时更新
  
//     init(tiles: TilesRenderer) {
//       this.tiles = tiles;
  
//       tiles.addEventListener("load-model", this._onLoadModelCB);
//     }
  
//     _onLoadModelCB = ({ scene }: { scene: Object3D }) => {
//       this._onLoadModel(scene);
//     };
  
//     _onLoadModel(scene: Object3D) {
//       this.splitMeshCache.clear();
  
//       buildOidToFeatureIdMap(scene);
//       scene.traverse((c) => {
//         if ((c as Mesh).material) {
//           this._setupMaterial(c as Mesh);
//         }
//       });
//     }
  
//     /**
//      * 尝试从shader更新WebGL限制
//      * @param shader shader 对象
//      */
//     _updateWebGLLimits(shader: any): void {
//       // 这里暂时无法直接获取WebGL上下文，保持默认值
//       // 在实际应用中，可以通过其他方式获取渲染器的WebGL上下文
//       // 例如：const gl = renderer.getContext();
//       // const maxVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
//       // this.maxUniformVectors = Math.floor(maxVectors * 2);
//     }
  
//     /**
//      * 动态计算 FEATURE_ID_COUNT
//      * 根据 WebGL 的 MAX_FRAGMENT_UNIFORM_VECTORS 限制和当前 oid 数组长度来确定最合适的数组大小
//      * @returns 计算出的 FEATURE_ID_COUNT 值
//      */
//     _calculateFeatureIdCount(): number {
//       // 使用缓存的 WebGL 限制值
//       const maxUniformVectors = this.maxUniformVectors;
      
//       // 当前需要隐藏的 oid 数量
//       const currentOidCount = this.oids.length;
      
//       // 确定最终的 FEATURE_ID_COUNT
//       let featureIdCount = 128; // 最小值
      
//       // 如果 oid 数量小于 128，使用 128
//       if (currentOidCount <= 128) {
//         featureIdCount = 128;
//       } else {
//         // 计算所需的最小容量（取当前 oid 数量和最大容量的较小值）
//         const requiredCount = Math.min(currentOidCount, maxUniformVectors);
        
//         // 找到合适的2的幂次方大小 (128, 256, 512, 1024, ...)
//         while (featureIdCount < requiredCount && featureIdCount < maxUniformVectors) {
//           featureIdCount *= 2;
//         }
//       }
      
//       // 确保不超过 WebGL 限制
//       featureIdCount = Math.min(featureIdCount, maxUniformVectors);
      
//       return featureIdCount;
//     }
  
//     /**
//      * Set up shader modification for hiding specific features
//      * This function encapsulates the logic of hiding specific featureIds by modifying the material shader through onBeforeCompile
//      * @param material Three.js material object
//      */
//     _setupMaterial(mesh: Mesh) {
//       const material = mesh.material as Material;
  
//       material.onBeforeCompile = (shader) => {
//         // 尝试更新 WebGL 限制（如果可以获取渲染器的话）
//         this._updateWebGLLimits(shader);
        
//         // 动态计算 FEATURE_ID_COUNT
//         const featureIdCount = this._calculateFeatureIdCount();
//         const define = `#define FEATURE_ID_COUNT ${featureIdCount}`;
//         // Add uniform declaration
//         shader.uniforms.hiddenFeatureIds = new FeatureIdUniforms(mesh, this);
  
//         // Modify vertex shader
//         shader.vertexShader = shader.vertexShader.replace(
//           "#include <common>",
//           `#include <common>
//                attribute float _feature_id_0;
//                varying float vFeatureId;`
//         );
  
//         shader.vertexShader = shader.vertexShader.replace(
//           "#include <begin_vertex>",
//           `#include <begin_vertex>
//                vFeatureId = _feature_id_0;`
//         );
  
//         // Modify fragment shader - add define first
//         shader.fragmentShader = define + '\n' + shader.fragmentShader;
        
//         shader.fragmentShader = shader.fragmentShader.replace(
//           "#include <common>",
//           `#include <common>
//                uniform float hiddenFeatureIds[FEATURE_ID_COUNT];
//                uniform int hiddenFeatureIdsCount;
//                varying float vFeatureId;
        
//                bool shouldHideFeature(float featureId) {
//                  for(int i = 0; i < FEATURE_ID_COUNT; i++) {
//                    if(abs(hiddenFeatureIds[i] - featureId) < 0.001) {
//                      return true;
//                    }
//                  }
//                  return false;
//                }`
//         );
  
//         // Add discard logic at the beginning of the fragment shader
//         shader.fragmentShader = shader.fragmentShader.replace(
//           "void main() {",
//           `void main() {
//              if(shouldHideFeature(vFeatureId)) {
//                discard;
//              }`
//         );
//       };
//     }
  
//     queryFeatureFromIntersection(hit: Intersection): FeatureInfo {
//       return queryFeatureFromIntersection(hit);
//     }
  
//     /**
//      * 通过uuid数组获取对应的mesh数组
//      * @param uuids mesh的uuid数组
//      * @returns 对应的mesh数组
//      */
//     _getMeshesByUuids(uuids: string[]): Mesh[] {
//       if (!this.tiles) {
//         return [];
//       }
  
//       const meshes: Mesh[] = [];
//       this.tiles.forEachLoadedModel((scene: Object3D) => {
//         scene.traverse((obj: Object3D) => {
//           if (obj instanceof Mesh && uuids.includes(obj.uuid)) {
//             meshes.push(obj);
//           }
//         });
//       });
  
//       return meshes;
//     }
  
//     getMeshesByOid(oid: number): Mesh[] {
//       const tileMeshes = getTileMeshesByOid(this.tiles!, oid); //获取瓦片mesh，通过瓦片mesh获取uuid
  
//       const allSplitMeshes: Mesh[] = [];
  
//       for (const tileMesh of tileMeshes) {
//         // 使用oid+tileMesh.uuid组合作为缓存key
//         const cacheKey = `${oid}_${tileMesh.uuid}`;
  
//         // 先从缓存中查找
//         let splitMeshes = this.splitMeshCache.get(cacheKey);
  
//         if (!splitMeshes) {
//           // 如果缓存中没有，则调用getSplitMeshesFromTile方法
//           splitMeshes = getSplitMeshesFromTile(tileMesh, oid);
//           // 存储到缓存中
//           this.splitMeshCache.set(cacheKey, splitMeshes);
//         }
  
//         allSplitMeshes.push(...splitMeshes);
//       }
  
//       return allSplitMeshes;
//     }
  
//     /**
//      * Hide the corresponding part of the original mesh according to the OID array
//      * @param oids Array of OIDs to hide
//      * @returns Number of meshes successfully applied shader
//      */
//     hideByOids(oids: number[]): void {
//       this.oids = oids;
//     }
  
//     /**
//      * Restore the display of the corresponding mesh according to the OID array
//      * @param oids Array of OIDs to restore
//      */
//     unhideByOids(oids: number[]): void {
//       // Remove the incoming OID from the existing hidden OID array to restore the display of the corresponding mesh
//       this.oids = this.oids.filter((existingOid) => !oids.includes(existingOid));
//     }
  
//     /**
//      * Restore the original materials of the mesh
//      */
//     unhide(): void {
//       this.oids = [];
//     }
  
//     dispose() {
//       const tiles = this.tiles;
  
//       if (tiles) {
//         tiles.removeEventListener("load-model", this._onLoadModelCB);
//       }
  
//       this.splitMeshCache.clear();
//     }
//   }

  