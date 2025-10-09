import { BufferAttribute, BufferGeometry, Mesh, Object3D } from "three";

import { TilesRenderer } from "3d-tiles-renderer";

// 获取瓦片mesh  获取单体化mesh分2步

/**
 * 预建featureId到顶点索引的映射表，提高大数据查询性能
 * @param featureIdAttr - Feature ID attribute
 * @returns featureId到顶点索引集合的映射
 */
function buildFeatureIdIndexMap(
  featureIdAttr: BufferAttribute
): Map<number, Set<number>> {
  const featureIdMap = new Map<number, Set<number>>();

  for (let i = 0; i < featureIdAttr.count; i++) {
    const featureId = featureIdAttr.getX(i);

    if (!featureIdMap.has(featureId)) {
      featureIdMap.set(featureId, new Set<number>());
    }
    featureIdMap.get(featureId)!.add(i);
  }

  return featureIdMap;
}

/**
 * 异步版本的预建索引映射表
 * @param featureIdAttr - Feature ID attribute
 * @param onProgress - 进度回调函数
 * @returns featureId到顶点索引集合的映射
 */
// async function buildFeatureIdIndexMapAsync(
//   featureIdAttr: BufferAttribute,
//   onProgress?: (progress: number) => void
// ): Promise<Map<number, Set<number>>> {
//   const featureIdMap = new Map<number, Set<number>>();
//   const CHUNK_SIZE = 5000; // 异步处理时用更小的块

//   for (let start = 0; start < featureIdAttr.count; start += CHUNK_SIZE) {
//     const end = Math.min(start + CHUNK_SIZE, featureIdAttr.count);

//     for (let i = start; i < end; i++) {
//       const featureId = featureIdAttr.getX(i);

//       if (!featureIdMap.has(featureId)) {
//         featureIdMap.set(featureId, new Set<number>());
//       }
//       featureIdMap.get(featureId)!.add(i);
//     }

//     // 报告进度
//     if (onProgress) {
//       const progress = (end / featureIdAttr.count) * 100;
//       onProgress(progress);
//     }

//     // 让出主线程，避免阻塞UI
//     await new Promise(resolve => setTimeout(resolve, 0));
//   }

//   return featureIdMap;
// }

/**
 * Create a geometry for a specified feature ID (优化版本)
 * @param originalGeometry - Original geometry
 * @param featureIdMap - 预建的featureId索引映射表
 * @param targetFeatureId - Target feature ID
 * @returns New geometry or null if no target feature ID is found
 */
function createGeometryForFeatureIdOptimized(
  originalGeometry: BufferGeometry,
  featureIdMap: Map<number, Set<number>>,
  targetFeatureId: number
): BufferGeometry | null {
  // Create a new geometry instance
  const newGeometry = new BufferGeometry();

  // 直接从映射表获取目标顶点索引
  const targetVertexIndices = featureIdMap.get(targetFeatureId);

  if (!targetVertexIndices || targetVertexIndices.size === 0) {
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

  return newGeometry;
}

/**
 * Create a geometry for a specified feature ID (原版本，保持兼容性)
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

  return newGeometry;
}

/**
 * Function to split mesh by feature ID (优化版本)
 * @param originalMesh - Original mesh
 * @param oid - Target OID
 * @param onProgress - 进度回调函数
 * @returns Promise<Array of split meshes>
 */
function splitMeshByOidOptimized(originalMesh: Mesh, oid: number): Mesh[] {
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

  // 异步构建索引映射表
  const featureIdMap = buildFeatureIdIndexMap(featureIdAttr);

  const currentBatchMeshes: Mesh[] = [];

  // 使用优化后的方法创建几何体
  for (const [fid] of featureIdMap) {
    try {
      // 先检查属性数据，避免不必要的几何体创建
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
            const newGeometry = createGeometryForFeatureIdOptimized(
              geometry,
              featureIdMap,
              fid
            );

            if (newGeometry && newGeometry.attributes.position.count > 0) {
              // Create new material - use native Three.js material
              const newMaterial = (originalMesh.material as any).clone();

              // Create new mesh
              const newMesh = new Mesh(newGeometry, newMaterial);
              newMesh.parent = originalMesh.parent;
              newMesh.position.copy(originalMesh.position);
              newMesh.rotation.copy(originalMesh.rotation);
              newMesh.scale.copy(originalMesh.scale);
              newMesh.matrixWorld.copy(originalMesh.matrixWorld);

              // Copy user data
              newMesh.userData = {
                ...originalMesh.userData,
                featureId: fid,
                oid: oid,
                originalMesh: originalMesh,
                propertyData: propertyData,
                isSplit: true,
              };

              newMesh.name = `feature_${fid}_${oid || ""}`;
              currentBatchMeshes.push(newMesh);
            }
          }
        } catch (e) {
          console.warn(`Failed to get property data for feature ${fid}:`, e);
        }
      }
    } catch (error) {
      console.warn(`Error creating mesh for feature ${fid}:`, error);
    }
  }

  return currentBatchMeshes;
}

/**
 * Function to split mesh by feature ID (原版本，保持兼容性)
 * @param originalMesh - Original mesh
 * @param oid - Target OID
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
              const newMaterial = (originalMesh.material as any).clone();

              // Create new mesh
              const newMesh = new Mesh(newGeometry, newMaterial);
              newMesh.parent = originalMesh.parent;
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
                isSplit: true,
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
 * 第一步：根据OID获取包含该OID的瓦片mesh
 * @param tiles - Three.js场景对象
 * @param oid - OID标识符 (number)
 * @returns 包含目标OID的瓦片mesh数组
 */
export function getTileMeshesByOid(tiles: TilesRenderer, oid: number): Mesh[] {
  const tileMeshes: Mesh[] = [];

  // group可能会嵌套
  tiles.group.traverse((child: Object3D) => {
    const mesh = child as Mesh;

    // 检查mesh是否有feature相关数据
    if (
      mesh.userData.meshFeatures &&
      mesh.userData.structuralMetadata &&
      !mesh.userData.isSplit
    ) {
      // 检查这个瓦片mesh是否包含目标oid
      if (checkMeshContainsOid(mesh, oid)) {
        tileMeshes.push(mesh);
      }
    }
  });

  return tileMeshes;
}

/**
 * 检查mesh是否包含指定的OID
 * @param mesh - 瓦片mesh
 * @param oid - 目标OID
 * @returns 是否包含目标OID
 */
function checkMeshContainsOid(mesh: Mesh, oid: number): boolean {
  // 优先使用idmap进行快速查找

  return !!mesh.userData.idMap[oid];

  // // 如果没有idmap，回退到原来的方法
  // const { meshFeatures, structuralMetadata } = mesh.userData;

  // if (!meshFeatures || !structuralMetadata) {
  //   return false;
  // }

  // const { geometry, featureIds } = meshFeatures;

  // // 使用第一个feature ID属性
  // const featureId = featureIds[0];
  // const featureIdAttr = geometry.getAttribute(
  //   `_feature_id_${featureId.attribute}`
  // );

  // if (!featureIdAttr) {
  //   return false;
  // }

  // // 获取所有唯一的feature ID
  // const uniqueFeatureIds = new Set<number>();
  // for (let i = 0; i < featureIdAttr.count; i++) {
  //   uniqueFeatureIds.add(featureIdAttr.getX(i));
  // }

  // // 检查是否有任何feature包含目标oid
  // for (const fid of uniqueFeatureIds) {
  //   try {
  //     const propertyData = structuralMetadata.getPropertyTableData(
  //       featureId.propertyTable,
  //       fid
  //     );
  //     const _oid = (propertyData as any)?._oid;
  //     if (_oid === oid) {
  //       return true;
  //     }
  //   } catch (e) {
  //     // 忽略错误，继续检查下一个feature
  //   }
  // }

  // return false;
}

/**
 * 优化版本：异步获取分割后的mesh
 * @param tileMesh - 瓦片mesh
 * @param oid - 目标OID
 * @param onProgress - 进度回调函数
 * @returns Promise<分割后的mesh数组>
 */
export function getSplitMeshesFromTileOptimized(
  tileMesh: Mesh,
  oid: number
): Mesh[] {
  let meshes: Mesh[] = [];

  try {
    const splitMeshes = splitMeshByOidOptimized(tileMesh, oid);
    meshes = [...meshes, ...splitMeshes];
  } catch (error) {
    console.warn(`拆分mesh失败:`, error);
  }

  return meshes;
}

export function getSplitMeshesFromTile(tileMesh: Mesh, oid: number): Mesh[] {
  let meshes: Mesh[] = [];

  try {
    const splitMeshes = splitMeshByOid(tileMesh, oid);
    meshes = [...meshes, ...splitMeshes];
  } catch (error) {
    console.warn(`拆分mesh失败:`, error);
  }

  return meshes;
}
