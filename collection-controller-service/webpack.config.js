import path from 'path';
import url from 'url';
import nodeExternals from 'webpack-node-externals';

const cwd = url.fileURLToPath(import.meta.url);

export default {
  mode: 'development',
  entry: {
    index: './src/index.ts',
  },
  target: ['node'], // use require() & use NodeJs CommonJS style
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  externalsPresets: {
    node: true, // in order to ignore built-in modules like path, fs, etc.
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: [/node_modules/, path.normalize(path.join(path.dirname(cwd), 'node_modules'))],
        sideEffects: false,
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
    extensionAlias: {
      '.js': ['.js', '.ts'],
    },
    alias: {
      '@frameworks': path.normalize(path.join(path.dirname(cwd), 'src/frameworks')),
      '@services': path.normalize(path.join(path.dirname(cwd), 'src/services')),
      '@adapters': path.normalize(path.join(path.dirname(cwd), 'src/adapters')),
      '@entities': path.normalize(path.join(path.dirname(cwd), 'src/entities')),
      '@modules': path.normalize(path.join(path.dirname(cwd), 'src/modules')),
      '@repositories': path.normalize(path.join(path.dirname(cwd), 'src/respositories')),
    },
  },
  output: {
    filename: '[name].cjs',
    path: path.normalize(path.join(path.dirname(cwd), 'build')),
    chunkFormat: 'module',
    chunkLoading: 'import',
    module: true,
    environment: {
      module: true,
      dynamicImport: true,
    },
  },
};
