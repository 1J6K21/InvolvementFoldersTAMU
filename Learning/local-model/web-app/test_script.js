import React from 'react';
import { renderToString } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const contentWithSpace = "$ L(A) = CA $";
const elementWithSpace = React.createElement(ReactMarkdown, { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }, contentWithSpace);
console.log("With space:", renderToString(elementWithSpace));

const contentNoSpace = "$L(A) = CA$";
const elementNoSpace = React.createElement(ReactMarkdown, { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }, contentNoSpace);
console.log("No space:", renderToString(elementNoSpace));
