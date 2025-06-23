window.MathJax = {
    tex: {
      inlineMath:  ['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']]
      processEscapes: true,
      processEnvironments: true
    },
    options: {
      ignoreHtmlClass: ".*|",
      processHtmlClass: "arithmatex
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
    }
  };
  
  document$.subscribe(() => {
    MathJax.typesetPromise()
  })
  