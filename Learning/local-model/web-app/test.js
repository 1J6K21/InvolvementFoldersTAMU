import React from 'react';
import { renderToString } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const preprocessLaTeX = (content) => {
    let processedContent = content.replace(/\\\[/g, "$$$$").replace(/\\\]/g, "$$$$");
    processedContent = processedContent.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
    return processedContent;
};

const content = "$ L(A) = CA $"; // Just plain $ math $
console.log("Original:", content);

const element = React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex]
}, content);

console.log("Rendered:");
console.log(renderToString(element));
