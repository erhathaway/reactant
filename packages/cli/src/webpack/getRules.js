import path from 'path';
import pkgDir from 'pkg-dir';

const rootPath = pkgDir.sync(process.cwd());

export default function getRules({ paths }, { platform }) {
  const include = [
    path.resolve(rootPath, paths.src),
    path.resolve(rootPath, paths.platform),
    pkgDir.sync(
      require.resolve(platform.name, {
        paths: [path.resolve(rootPath, 'node_modules')]
      })
    ),
    pkgDir.sync(require.resolve('@reactant/core'), {
      paths: [path.resolve(rootPath, 'node_modules')]
    })
  ];
  return [
    {
      test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
      include,
      loader: require.resolve('url-loader'),
      options: {
        limit: 10000,
        name: 'media/[name].[hash:8].[ext]'
      }
    },
    {
      test: /\.html?$/,
      include,
      loader: require.resolve('html-loader')
    },
    {
      test: /\.md$/,
      include,
      use: [
        {
          loader: require.resolve('html-loader')
        },
        {
          loader: require.resolve('markdown-loader'),
          options: {
            pedantic: true,
            gfm: true,
            breaks: true
          }
        }
      ]
    },
    {
      include,
      exclude: [
        /\.(js|jsx|mjs)$/,
        /\.(less)$/,
        /\.(re)$/,
        /\.(s?css|sass)$/,
        /\.(ts|tsx)$/,
        /\.(vue)$/,
        /\.bmp$/,
        /\.ejs$/,
        /\.gif$/,
        /\.html?$/,
        /\.jpe?g$/,
        /\.json$/,
        /\.md$/,
        /\.png$/
      ],
      loader: require.resolve('file-loader'),
      options: {
        name: 'media/[name].[hash:8].[ext]'
      }
    }
  ];
}
