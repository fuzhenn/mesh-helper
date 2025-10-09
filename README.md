# 🔧 Mesh Helper

一个现代化的 TypeScript 工具函数库，提供常用的字符串、数组、对象和数学操作函数。

## ✨ 特性

- 🚀 **现代化**: 基于 ES2020+ 和 TypeScript 构建
- 📦 **轻量级**: 零依赖，按需导入
- 🔧 **功能丰富**: 涵盖字符串、数组、对象、数学等常用操作
- 📖 **类型安全**: 完整的 TypeScript 类型定义
- 🌍 **通用性**: 支持 Node.js 和浏览器环境
- ⚡ **高性能**: 经过优化的算法实现

## 📦 安装

```bash
npm install mesh-helper
```

或者使用其他包管理器：

```bash
yarn add mesh-helper
pnpm add mesh-helper
```

## 🚀 快速开始

### ES Module 导入

```typescript
// 导入全部功能
import * as MeshHelper from 'mesh-helper'

// 按需导入
import { capitalize, unique, deepClone, randomInt } from 'mesh-helper'
```

### CommonJS 导入

```javascript
const { capitalize, unique, deepClone, randomInt } = require('mesh-helper')
```

## 📚 API 文档

### 📝 字符串工具函数

#### `capitalize(str: string): string`
首字母大写转换
```typescript
capitalize('hello world') // 'Hello world'
```

#### `toCamelCase(str: string): string`
转换为驼峰命名
```typescript
toCamelCase('hello-world-example') // 'helloWorldExample'
```

#### `toKebabCase(str: string): string`
转换为短横线命名
```typescript
toKebabCase('HelloWorldExample') // 'hello-world-example'
```

#### `truncate(str: string, length: number, suffix?: string): string`
截断字符串
```typescript
truncate('这是一个很长的文本', 10) // '这是一个很长的文本...'
truncate('这是一个很长的文本', 8, '...') // '这是一个很...'
```

#### `stripHtml(str: string): string`
去除HTML标签
```typescript
stripHtml('<p>Hello <strong>World</strong></p>') // 'Hello World'
```

#### `randomString(length: number, chars?: string): string`
生成随机字符串
```typescript
randomString(8) // 'aB3kP9mQ'
randomString(6, '0123456789') // '123456'
```

### 📊 数组工具函数

#### `unique<T>(arr: T[]): T[]`
数组去重
```typescript
unique([1, 2, 2, 3, 3, 4]) // [1, 2, 3, 4]
```

#### `uniqueBy<T, K>(arr: T[], key: K): T[]`
基于对象属性去重
```typescript
const users = [
  { id: 1, name: '张三' },
  { id: 2, name: '李四' },
  { id: 1, name: '张三' }
]
uniqueBy(users, 'id') // [{ id: 1, name: '张三' }, { id: 2, name: '李四' }]
```

#### `chunk<T>(arr: T[], size: number): T[][]`
数组分块
```typescript
chunk([1, 2, 3, 4, 5, 6, 7], 3) // [[1, 2, 3], [4, 5, 6], [7]]
```

#### `shuffle<T>(arr: T[]): T[]`
数组打乱（返回新数组）
```typescript
shuffle([1, 2, 3, 4, 5]) // [3, 1, 5, 2, 4]
```

#### `intersection<T>(arr1: T[], arr2: T[]): T[]`
数组交集
```typescript
intersection([1, 2, 3], [2, 3, 4]) // [2, 3]
```

#### `difference<T>(arr1: T[], arr2: T[]): T[]`
数组差集
```typescript
difference([1, 2, 3], [2, 3, 4]) // [1]
```

#### `groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Record<K, T[]>`
数组分组
```typescript
const users = [
  { name: '张三', department: '技术部' },
  { name: '李四', department: '技术部' },
  { name: '王五', department: '市场部' }
]
groupBy(users, user => user.department)
// {
//   '技术部': [{ name: '张三', department: '技术部' }, { name: '李四', department: '技术部' }],
//   '市场部': [{ name: '王五', department: '市场部' }]
// }
```

### 🎯 对象工具函数

#### `deepClone<T>(obj: T): T`
深拷贝对象
```typescript
const original = { a: { b: { c: 1 } } }
const cloned = deepClone(original)
cloned.a.b.c = 2
console.log(original.a.b.c) // 1
```

#### `deepMerge<T>(target: T, ...sources: DeepPartial<T>[]): T`
深度合并对象
```typescript
const obj1 = { a: 1, b: { x: 1, y: 2 } }
const obj2 = { b: { y: 3, z: 4 }, c: 3 }
deepMerge(obj1, obj2) // { a: 1, b: { x: 1, y: 3, z: 4 }, c: 3 }
```

#### `get<T>(obj: any, path: string, defaultValue?: T): T | undefined`
获取深层属性值
```typescript
const obj = { a: { b: { c: 'hello' } } }
get(obj, 'a.b.c') // 'hello'
get(obj, 'a.b.d', 'default') // 'default'
```

#### `set<T>(obj: T, path: string, value: any): T`
设置深层属性值
```typescript
const obj = {}
set(obj, 'a.b.c', 'hello')
console.log(obj) // { a: { b: { c: 'hello' } } }
```

#### `pick<T, K>(obj: T, keys: K[]): Pick<T, K>`
选择指定属性
```typescript
pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) // { a: 1, c: 3 }
```

#### `omit<T, K>(obj: T, keys: K[]): Omit<T, K>`
排除指定属性
```typescript
omit({ a: 1, b: 2, c: 3 }, ['b']) // { a: 1, c: 3 }
```

#### `isEmpty(obj: object): boolean`
检查对象是否为空
```typescript
isEmpty({}) // true
isEmpty({ a: 1 }) // false
```

#### `getPaths(obj: any, prefix?: string): string[]`
获取对象所有路径
```typescript
getPaths({ a: { b: 1, c: { d: 2 } } }) // ['a', 'a.b', 'a.c', 'a.c.d']
```

### 🔢 数学工具函数

#### `randomInt(min: number, max: number): number`
生成随机整数
```typescript
randomInt(1, 10) // 3
```

#### `randomFloat(min: number, max: number): number`
生成随机浮点数
```typescript
randomFloat(1.0, 2.0) // 1.234567
```

#### `clamp(value: number, min: number, max: number): number`
数值限制在范围内
```typescript
clamp(150, 0, 100) // 100
clamp(-10, 0, 100) // 0
```

#### `map(value: number, inputMin: number, inputMax: number, outputMin: number, outputMax: number): number`
数值映射
```typescript
map(5, 0, 10, 0, 100) // 50
```

#### `round(value: number, decimals?: number): number`
保留指定小数位
```typescript
round(3.14159, 2) // 3.14
```

#### `distance(x1: number, y1: number, x2: number, y2: number): number`
计算两点距离
```typescript
distance(0, 0, 3, 4) // 5
```

#### `toRadians(degrees: number): number`
角度转弧度
```typescript
toRadians(180) // 3.141592653589793
```

#### `toDegrees(radians: number): number`
弧度转角度
```typescript
toDegrees(Math.PI) // 180
```

#### `average(numbers: number[]): number`
计算平均值
```typescript
average([1, 2, 3, 4, 5]) // 3
```

#### `sum(numbers: number[]): number`
计算总和
```typescript
sum([1, 2, 3, 4, 5]) // 15
```

#### `max(numbers: number[]): number`
获取最大值
```typescript
max([1, 5, 3, 9, 2]) // 9
```

#### `min(numbers: number[]): number`
获取最小值
```typescript
min([1, 5, 3, 9, 2]) // 1
```

#### `inRange(value: number, min: number, max: number): boolean`
判断是否在范围内
```typescript
inRange(5, 1, 10) // true
inRange(15, 1, 10) // false
```

## 🔧 类型定义

库提供了一些有用的类型定义：

```typescript
// API 响应类型
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

// 分页选项
interface PaginationOptions {
  page: number
  pageSize: number
  total?: number
}

// 排序选项
interface SortOptions {
  field: string
  order: 'asc' | 'desc'
}

// 深度可选类型
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// 深度必需类型
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}
```

## 🌐 浏览器支持

- Chrome >= 80
- Firefox >= 74
- Safari >= 13.1
- Edge >= 80

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📋 更新日志

### v1.0.0
- 初始版本发布
- 提供基础的字符串、数组、对象和数学工具函数 

Three.js mesh处理工具库，专门用于处理3D Tiles模型的单体化和基于shader的隐藏功能。

## 功能特性

### 1. 基于Shader的Mesh隐藏功能

通过自定义shader根据OID数组隐藏原始mesh的指定部分，性能优于几何体重构方式。

#### 主要函数

- `hideOriginalMeshByOids()` - 根据OID数组隐藏mesh的对应部分
- `restoreOidsByArray()` - 根据OID数组恢复被隐藏的特定部分
- `restoreOriginalMaterials()` - 恢复所有mesh的原始材质
- `updateHiddenOids()` - 动态更新隐藏的OID列表

#### 基本使用示例

```typescript
import { 
  hideOriginalMeshByOids, 
  restoreOidsByArray, 
  restoreOriginalMaterials 
} from 'mesh-helper';

// 1. 隐藏指定OID的物件
const hiddenCount = hideOriginalMeshByOids({
  oids: [1001, 1002, 1003], // 要隐藏的OID数组
  scene: scene,             // Three.js场景对象
  maxOids: 50,             // 最大支持的OID数量（可选）
  debug: true              // 是否启用调试模式（可选）
});

console.log(`成功隐藏了 ${hiddenCount} 个mesh的部分内容`);

// 2. 恢复指定OID的物件（部分恢复）
const restoredCount = restoreOidsByArray({
  oids: [1001, 1002],      // 要恢复的OID数组
  scene: scene,            // Three.js场景对象
  debug: true              // 是否启用调试模式（可选）
});

console.log(`成功恢复了 ${restoredCount} 个mesh的指定OID部分`);

// 3. 恢复所有原始材质（完全恢复）
const allRestoredCount = restoreOriginalMaterials(scene, { debug: true });
console.log(`恢复了 ${allRestoredCount} 个mesh的原始材质`);
```

#### 高级使用示例

```typescript
import { 
  hideOriginalMeshByOids,
  restoreOidsByArray,
  getMeshHiddenOids,
  getAllShaderedMeshInfo,
  updateHiddenOids
} from 'mesh-helper';

// 分步隐藏物件
hideOriginalMeshByOids({ oids: [1001, 1002, 1003], scene });
hideOriginalMeshByOids({ oids: [2001, 2002], scene });

// 查看所有应用了shader的mesh信息
const shaderedInfo = getAllShaderedMeshInfo();
shaderedInfo.forEach(({ mesh, hiddenOids }) => {
  console.log(`Mesh ${mesh.name} 隐藏的OIDs:`, hiddenOids);
});

// 部分恢复：只恢复特定OID
restoreOidsByArray({ oids: [1001, 2001], scene, debug: true });

// 动态更新隐藏列表
updateHiddenOids(scene, [1002, 1003, 2002]);

// 查看特定mesh的隐藏OID
scene.traverse(mesh => {
  if (mesh.type === 'Mesh') {
    const hiddenOids = getMeshHiddenOids(mesh);
    if (hiddenOids.length > 0) {
      console.log(`${mesh.name} 当前隐藏OIDs:`, hiddenOids);
    }
  }
});
```

#### Shader原理

1. **顶点着色器**：读取每个顶点的`_feature_id_0`属性，传递给片段着色器
2. **片段着色器**：
   - 根据featureId查找对应的OID
   - 检查OID是否在隐藏列表中
   - 如果在列表中，使用`discard`丢弃该片段
   - 否则正常渲染

3. **Uniforms数组**：将OID数组转换为固定长度的uniform数组传递给shader

#### 智能恢复机制

`restoreOidsByArray()` 函数提供了智能的部分恢复功能：

- **部分恢复**：如果mesh还有其他隐藏的OID，只更新shader的uniform数组
- **完全恢复**：如果没有其他隐藏的OID，直接恢复原始材质
- **性能优化**：避免不必要的shader重建，动态更新uniform即可

### 2. Mesh单体化功能

提供mesh拆分和管理功能，从existing mesh.ts模块继承。

- `getMeshesByOid()` - 根据OID获取单体mesh
- `splitMeshByFeatureId()` - 按feature ID拆分mesh
- `getAllIndividualMeshes()` - 获取所有单体mesh

### 3. 交集计算功能

从existing intersection.ts模块提供相交检测功能。

## 技术要求

- Three.js (建议版本 >= 0.150.0)
- 支持WebGL的浏览器环境
- Mesh必须包含`meshFeatures`和`structuralMetadata`用户数据
- Geometry必须包含`_feature_id_0`属性

## 注意事项

1. **Performance**: Shader方式比几何体重构性能更好，适合实时隐藏/显示场景
2. **兼容性**: 需要支持自定义shader的WebGL环境
3. **内存管理**: 自动管理原始材质的保存和恢复，避免内存泄漏
4. **最大OID限制**: 默认支持50个OID，可根据GPU能力调整

## API参考

### 核心接口

#### HideMeshOptions

```typescript
interface HideMeshOptions {
  oids: (string | number)[];  // 要隐藏的OID数组
  scene: any;                 // Three.js场景对象
  maxOids?: number;          // 最大支持的OID数量，默认50
  debug?: boolean;           // 是否启用调试模式，默认false
}
```

#### RestoreOidsOptions

```typescript
interface RestoreOidsOptions {
  oids: (string | number)[];  // 要恢复的OID数组
  scene: any;                 // Three.js场景对象
  debug?: boolean;           // 是否启用调试模式，默认false
}
```

### 主要函数

| 函数名 | 功能 | 返回值 |
|--------|------|--------|
| `hideOriginalMeshByOids()` | 隐藏指定OID的mesh部分 | 影响的mesh数量 |
| `restoreOidsByArray()` | 恢复指定OID的mesh部分 | 恢复的mesh数量 |
| `restoreOriginalMaterials()` | 恢复所有原始材质 | 恢复的mesh数量 |
| `getMeshHiddenOids()` | 获取mesh的隐藏OID列表 | OID数组 |
| `getAllShaderedMeshInfo()` | 获取所有shader mesh信息 | mesh信息数组 |
| `updateHiddenOids()` | 更新所有mesh的隐藏OID | 更新的mesh数量 |

### 返回值

所有主要函数都返回数字，表示操作影响的mesh数量，便于调试和性能监控。

## 使用场景

### 1. 建筑物单体隐藏/显示

```typescript
// 隐藏特定楼层
hideOriginalMeshByOids({ oids: [101, 102, 103], scene }); // 隐藏1-3层

// 只显示指定楼层
restoreOriginalMaterials(scene); // 先恢复所有
hideOriginalMeshByOids({ oids: [104, 105, 106, 107], scene }); // 隐藏4-7层
```

### 2. 设备管理

```typescript
// 隐藏所有管道设备
const pipeOids = [2001, 2002, 2003, 2004];
hideOriginalMeshByOids({ oids: pipeOids, scene });

// 显示部分管道进行检修
restoreOidsByArray({ oids: [2001, 2002], scene });
```

### 3. 动态展示

```typescript
// 循环展示不同区域
const areas = [[1001, 1002], [2001, 2002], [3001, 3002]];
let currentArea = 0;

setInterval(() => {
  restoreOriginalMaterials(scene);
  const otherAreas = areas.filter((_, i) => i !== currentArea).flat();
  hideOriginalMeshByOids({ oids: otherAreas, scene });
  currentArea = (currentArea + 1) % areas.length;
}, 3000);
```

## 开发说明

基于three.html中的`hideOriginalMeshFeature`函数逻辑实现，通过shader替代几何体重构以提升性能。

## 版本信息

当前版本: 1.0.0 