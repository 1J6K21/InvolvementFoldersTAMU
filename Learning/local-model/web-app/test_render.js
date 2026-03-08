import { renderToString } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const content = "$ L(A) = CA $";
const element = ReactMarkdown({
  children: content,
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex]
});
console.log(renderToString(element));
