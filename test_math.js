const marked = require('marked');
const markedKatex = require('marked-katex-extension');

marked.use(markedKatex({ throwOnError: false, output: 'html' }));
console.log(marked.parse('Hello world!'));
console.log(marked.parse('Block math: $$\\int x dx$$'));
console.log(marked.parse('Inline math: $E=mc^2$'));
