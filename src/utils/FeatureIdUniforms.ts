import type { MaptalksTilerPlugin } from "../MaptalksTilerPlugin";
import { Mesh } from "three";

export class FeatureIdUniforms {
  mesh: Mesh;
  plugin: MaptalksTilerPlugin;

  constructor(mesh: Mesh, plugin: MaptalksTilerPlugin) {
    this.mesh = mesh;
    this.plugin = plugin;
  }

  get value() {
    const idMap = this.mesh.userData.idMap;
    const mappedValues = this.plugin.oids.map((oid) => idMap[oid]);
    
    // 填充剩余位置为-1，避免与featureId为0的mesh冲突
    const result = new Array(this.plugin.getFeatureIdCount()).fill(-1);
    for (let i = 0; i < mappedValues.length; i++) {
      result[i] = mappedValues[i];
    }
    
    return result;
  }
}
