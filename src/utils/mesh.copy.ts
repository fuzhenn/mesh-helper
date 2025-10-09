import { BufferAttribute, BufferGeometry, Mesh, Object3D } from "three";

import { TilesRenderer } from "3d-tiles-renderer";

// 获取瓦片mesh  获取单体化mesh分2步

/**
 * Create a geometry for a specified feature ID
 * @param originalGeometry - Original geometry
 * @param featureIdAttr - Feature ID attribute
 * @param targetFeatureId - Target feature ID
 * @returns New geometry or null if no target feature ID is found
 */
function createGeometryForFeatureId(
  originalGeometry: BufferGeometry,
  featureIdAttr: BufferAttribute,
  targetFeatureId: number
): BufferGeometry | null {
  // Create a new geometry instance
  const newGeometry = new BufferGeometry();

  // Find all vertex indices that belong to the target feature ID
  const targetVertexIndices = new Set<number>();
  for (let i = 0; i < featureIdAttr.count; i++) {
    if (featureIdAttr.getX(i) === targetFeatureId) {
      targetVertexIndices.add(i);
    }
  }

  if (targetVertexIndices.size === 0) {
    return null;
  }

  // Directly reference all attributes of the original geometry without copying
  const attributes = originalGeometry.attributes;
  for (const attributeName in attributes) {
    newGeometry.setAttribute(attributeName, attributes[attributeName]);
  }

  // Rebuild the index array, only containing triangles that belong to the target feature ID
  if (originalGeometry.index) {
    const originalIndex = originalGeometry.index.array;
    const newIndices: number[] = [];

    // Traverse all triangles, only keeping triangles where all vertices belong to the target feature ID
    for (let i = 0; i < originalIndex.length; i += 3) {
      const a = originalIndex[i];
      const b = originalIndex[i + 1];
      const c = originalIndex[i + 2];

      if (
        targetVertexIndices.has(a) &&
        targetVertexIndices.has(b) &&
        targetVertexIndices.has(c)
      ) {
        newIndices.push(a, b, c);
      }
    }

    if (newIndices.length > 0) {
      newGeometry.setIndex(newIndices);
    }
  }

  // Calculate bounding box and sphere
  newGeometry.computeBoundingBox();
  newGeometry.computeBoundingSphere();

  return newGeometry;
}

/**
 * Function to split mesh by feature ID
 * @param originalMesh - Original mesh
 * @param meshFeatures - Mesh features
 * @param structuralMetadata - Structural metadata
 * @returns Array of split meshes
 */
function splitMeshByOid(originalMesh: Mesh, oid: number): Mesh[] {
  const { meshFeatures, structuralMetadata } = originalMesh.userData;
  const { geometry, featureIds } = meshFeatures;
  // Use the first feature ID attribute
  const featureId = featureIds[0];
  const featureIdAttr = geometry.getAttribute(
    `_feature_id_${featureId.attribute}`
  );

  if (!featureIdAttr) {
    console.warn("No feature ID attribute found");
    return [];
  }

  // Get all unique feature IDs
  const uniqueFeatureIds = new Set<number>();
  for (let i = 0; i < featureIdAttr.count; i++) {
    uniqueFeatureIds.add(featureIdAttr.getX(i));
  }

  const currentBatchMeshes: Mesh[] = []; // Current batch of split meshes

  // Create an individual mesh for each feature ID
  uniqueFeatureIds.forEach((fid) => {
    try {
      const newGeometry = createGeometryForFeatureId(
        geometry,
        featureIdAttr as BufferAttribute,
        fid
      );
      if (newGeometry && newGeometry.attributes.position.count > 0) {
        // Get property data for the feature
        let _oid = null;
        let propertyData = null;
        if (structuralMetadata) {
          try {
            propertyData = structuralMetadata.getPropertyTableData(
              featureId.propertyTable,
              fid
            );
            _oid = (propertyData as any)?._oid;
            if (_oid === oid) {
              // Create new material - use native Three.js material
              const newMaterial = originalMesh.material;

              // Create new mesh
              const newMesh = new Mesh(newGeometry, newMaterial);
              newMesh.position.copy(originalMesh.position);
              newMesh.rotation.copy(originalMesh.rotation);
              newMesh.scale.copy(originalMesh.scale);
              newMesh.matrixWorld.copy(originalMesh.matrixWorld);

              // Copy user data
              newMesh.userData = {
                ...originalMesh.userData,
                featureId: fid,
                oid: oid,
                originalMesh: originalMesh, // Save a reference to the original mesh
                propertyData: propertyData,
              };

              newMesh.name = `feature_${fid}_${oid || ""}`;

              currentBatchMeshes.push(newMesh);
            }
          } catch (e) {
            console.warn(`Failed to get property data for feature ${fid}:`, e);
          }
        }
      }
    } catch (error) {
      console.warn(`Error creating mesh for feature ${fid}:`, error);
    }
  });

  return currentBatchMeshes;
}

/**
 * Get array of individual meshes by OID
 * @param tiles - Three.js scene object
 * @param oid - OID identifier (number)
 * @returns Array of matching meshes
 */
export function getMeshesByOid(
  tiles: TilesRenderer, // Use any type to avoid THREE dependency
  oid: number
): Mesh[] {
  let meshes: Mesh[] = [];

  tiles.group.traverse((child: Object3D) => {
    if (child instanceof Mesh) {
      const mesh = child as Mesh;

      // Check if mesh has feature related data
      if (mesh.userData.meshFeatures && mesh.userData.structuralMetadata) {
        try {
          const splitMeshes = splitMeshByOid(mesh, oid);
          meshes = [...meshes, ...splitMeshes];
        } catch (error) {
          console.warn(`拆分mesh失败:`, error);
        }
      }
    }
  });

  return meshes;
}

/**
 * Get mesh groups by OID array
 * @param tiles - Three.js scene object
 * @param oids - OID array (numbers)
 * @param options - Get options
 * @returns Mapping of OID to mesh arrays
 */
export function getMeshesGroupedByOid(
  tiles: TilesRenderer,
  oids: number[]
): Map<number, Mesh[]> {
  const result = new Map<number, Mesh[]>();

  oids.forEach((oid) => {
    const meshes = getMeshesByOid(tiles, oid);
    if (meshes.length > 0) {
      result.set(oid, meshes);
    }
  });

  return result;
}
