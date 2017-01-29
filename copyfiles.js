const copyfiles = require('copyfiles');

copyfiles([
    './node_modules/font-awesome/**/*',
    './node_modules/initialize-css/**/*',
    './node_modules/cropperjs/**/*',
    './node_modules/delegate/**/*',
    './node_modules/stepperjs/**/*',
    'vendors'
], {up: 1}, () => {});
