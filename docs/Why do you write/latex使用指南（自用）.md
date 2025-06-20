# 字体
## 大小
在 LaTeX 中，您可以通过全局或局部方式设置字体大小。以下是常用的方法：

---

### 全局设置字体大小

在文档类声明中指定字体大小，例如：

```latex
\documentclass[12pt]{article}
```

常用的全局字体大小选项包括：

- `10pt`（默认）
    
- `11pt`
    
- `12pt`
    

---

### 局部设置字体大小

LaTeX 提供了多种命令来调整局部文本的字体大小，从小到大依次为：

- `\tiny`
    
- `\scriptsize`
    
- `\footnotesize`
    
- `\small`
    
- `\normalsize`（默认）
    
- `\large`
    
- `\Large`
    
- `\LARGE`
    
- `\huge`
    
- `\Huge`
    

例如：

```latex
{\small 这是小号字体的文本。}
```

需要注意的是，这些命令的实际字号取决于全局设置的基准字号。例如，在 `\documentclass[10pt]{article}` 中，`\small` 对应的字号为 9pt；而在 `\documentclass[12pt]{article}` 中，`\small` 对应的字号为 11pt。

---

### 自定义字体大小

如果需要设置特定的字号，可以使用 `\fontsize{字号}{行距}\selectfont` 命令。例如：

```latex
{\fontsize{14pt}{16pt}\selectfont 自定义字号的文本。}
```

这将设置字号为 14pt，行距为 16pt。

---

### 中文字号对应关系（供参考）

在中文排版中，字号通常以“号”来表示，对应的点数如下：

|中文字号|对应点数|
|---|---|
|初号|42pt|
|小初|36pt|
|一号|26pt|
|小一|24pt|
|二号|22pt|
|小二|18pt|
|三号|16pt|
|小三|15pt|
|四号|14pt|
|小四|12pt|
|五号|10.5pt|
|小五|9pt|
|六号|7.5pt|
|小六|6.5pt|
|七号|5.5pt|
|八号|5pt|

您可以根据需要使用 `\fontsize` 命令设置相应的字号。

---

如果您有特定的排版需求或遇到问题，欢迎提供更多信息，以便提供更具体的建议。

# 公式速查表
https://zhuanlan.zhihu.com/p/686538247
![公式速查1|400](https://kold.oss-cn-shanghai.aliyuncs.com/%E5%85%AC%E5%BC%8F%E9%80%9F%E6%9F%A51.png)![公式速查2|400](https://kold.oss-cn-shanghai.aliyuncs.com/%E5%85%AC%E5%BC%8F%E9%80%9F%E6%9F%A52.png)