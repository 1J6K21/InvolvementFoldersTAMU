import React from 'react';
import { renderToString } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

const content = "$ L(A) = CA $";
const element = React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [rehypeKatex]
}, content);

console.log(renderToString(element));
