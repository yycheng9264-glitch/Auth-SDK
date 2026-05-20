// ============================================================
// rollup.config.mjs — 构建配置
// 输出三种格式：
//   - ESM  : 供现代打包工具（Webpack / Vite / Rollup）使用
//   - CJS  : 供 Node.js require 使用
//   - UMD  : 供浏览器 <script> 标签直接引入
// ============================================================

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  // 入口文件，所有代码从此处导出
  input: 'src/index.ts',

  // 输出三种格式的构建产物
  output: [
    {
      // ESM 格式 —— 用于 import 引入
      file: 'dist/auth-sdk.esm.js',
      format: 'es',
      sourcemap: true,
    },
    {
      // CommonJS 格式 —— 用于 require 引入
      file: 'dist/auth-sdk.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      // UMD 格式 —— 用于浏览器 <script> 标签直接引入
      // 全局变量名为 AuthSDK，使用时通过 window.AuthSDK 或 AuthSDK 访问
      file: 'dist/auth-sdk.umd.js',
      format: 'umd',
      name: 'AuthSDK',
      sourcemap: true,
    },
  ],

  plugins: [
    // 解析 node_modules 中的模块
    resolve(),
    // 将 CommonJS 模块转换为 ESM
    commonjs(),
    // TypeScript 编译，自动读取 tsconfig.json
    typescript({
      tsconfig: './tsconfig.json',
      // declarationDir 由 tsconfig.json 控制
      declaration: true,
      declarationDir: 'dist/types',
    }),
  ],
};
