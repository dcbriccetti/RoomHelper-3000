const path = require('path');

module.exports = {
  entry: {
    teacher_bundle: './src/teacher-launcher.ts',
    student_bundle: './src/student-launcher.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'static/js'),
    library: 'RoomHelper3000',
    libraryTarget: 'var',
  },
};
