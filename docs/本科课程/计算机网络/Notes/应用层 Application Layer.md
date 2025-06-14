---
本科课程: 计算机网络
---
### 应用层复习框架

---

#### **1. 网络应用模型**

- **客户/服务器模型**
    
    - 定义：固定服务器和多个客户机之间的交互。
        
    - 特点：集中化管理，资源固定在服务器上。
        
    - 示例：Web 服务、FTP。
        
- **P2P模型**
	- Peer to Peer
    
    - 定义：对等端之间直接通信，资源分布在各个节点。
        
    - 特点：分布式结构，高扩展性。
        
    - 示例：BitTorrent、Skype。
        

---

#### **2. DNS系统**

- **层次域名空间**
	- 域名结构：根域名、顶级域名（TLD）、二级域名等。
	- 例子：`www.example.com`。
        
- **域名服务器**
    - **根域名服务器**
	    - **保存了顶级域名的信息**，如 `.com, .org, .net, .edu`
    - **顶级域名服务器**（TLD服务器）
	    - 负责管理顶级域名
    - **权威域名服务器**
	    - 在因特网具有公共可访问主机。
	    - 属于**组织或机构**。供对特定的域名到 IP 地址的授权映射。
    - **本地域名服务器**
	    - 不严格属于 DNS **层次结构**
	    - 每个住宅 ISP，大学，公司都维护着自己的本地域名服务器。
	    - 主机发起 DNS 查询时候，查询发送到本地 DNS 服务器
- 
- **域名解析过程**
    - 递归查询与迭代查询
    - 流程：客户端 → 本地域名服务器 → 各级域名服务器 → 解析出 IP 地址。
![image.png|500](https://kold.oss-cn-shanghai.aliyuncs.com/20250611141953.png)

---

#### **3. FTP（文件传输协议）**
- File Transfer Protocol
- 基于 **TCP**
- Client/Server 模型。Client 初始化文件来发送

- **FTP协议的工作原理**
    - 双通道模式：**控制连接（21端口）与数据连接（20端口）**。
    - ![image.png|500](https://kold.oss-cn-shanghai.aliyuncs.com/20250611142916.png)

	- 流程：
		- FTP client 通过 port 21 连接 FTP server，打开一条控制链接
		- Client 认证，通过发送指令打开远程目录
		- Server 收到传输指令，server 打开 **2nd** TCP 数据连接，用于文件传输
			- One connection for each file transferred
    - 数据传输模式：主动模式与被动模式。
- **控制连接与数据连接**
    - 控制连接：管理命令和状态信息。
    - 数据连接：传输文件内容。
        

---

#### **4. 电子邮件**
- **电子邮件系统的组成结构**
    - 用户代理（UA）：发送和接收邮件的用户界面。
    - 邮件服务器：存储和转发邮件的服务器。
    - 邮件传输代理（MTA）：邮件的传输机制。
- **电子邮件格式与 MIME**
    - 邮件头部：发件人、收件人、主题等信息。
    - 邮件正文：文本内容、附件。
    - **MIME（Multipurpose Internet Mail Extensions）：扩展支持多媒体附件。**
        
- **SMTP协议与 POP3协议**
    - SMTP（Simple Mail Transfer Protocol）：邮件发送协议。
    - POP3（Post Office Protocol 3）：邮件接收协议。
- **SMTP**（Simple Mail Transfer Protocol）
	- 传输简单文字信息
	- 基于 TCP，端口 25 port
	- 直接传输
		- 从客户端向服务器传输 email 信息
	- SMTP Transaction
		- 三个阶段
		- 握手
		- 传输 1 个或多个邮件信息
		- 关闭连接
	- **Only ASCII text**

- **POP3**
	- Authorization（agent<-> server） and download
	- ![image.png|500](https://kold.oss-cn-shanghai.aliyuncs.com/20250611143338.png)
	- 客户端会输入指令
		- user
		- pass
	- 服务器回复
		- OK
		- ERR
	- 传输，客户端为给出
		- list：列出邮件号
		- retr：提取邮件，通过 number
		- dele：删除
		- quit
- **邮件报文首部**
	- From (must)
	- To (must)
	- Subject (optional)
- **IMAP**(Internet Mail Access Protocol)
	- **Manipulation of stored msgs on server**
- **邮件系统的组成部分**
	- User Agent
		- 组成、编辑、读电子邮件
		- e.g. Eudora, Outlook, Foxmail, Netscape Messenger
	- Outgoing, incoming mail messages stored on **server**

---

#### **5. WWW（万维网）**

- **WWW的概念与组成结构**
    - 概念：通过超文本传输协议（HTTP）访问的**分布式信息系统。**
    - 组成：**Web客户端、Web服务器、Web浏览器。**
    - **WWW**本质
	    - 由许多互连的文档（称为“页面”）组成的 **分布式数据库**，每一个事物都是一个资源，通过 URL 进行获取和访问
- **HTTP协议**
    - 特点：**无状态协议**
	    - 所谓 stateless，就是每个客户端请求和服务器的响应都被 **独立的处理**，服务器不保存先前请求的状态
	    - **优点**：故障处理更容易；服务器能够处理更高速率的请求；请求的顺序对服务器来说不重要
	    - **缺点**：某些应用程序需要保持持久状态
    - 支持 GET、POST 等方法。
    - HTTP/1.1、HTTP/2、HTTP/3 的主要改进。
- **Web缓存**（Cookie）
    - 定义：在客户端或代理服务器上缓存 Web 资源以提高访问速度。
    - 机制：缓存控制、过期时间等。
    - **问题**：隐私泄露
- **CDN（内容分发网络）**
    - 定义：通过分布式服务器网络优化内容交付。
    - 优势：降低延迟、提高访问速度。
- **效率**
	-  网页上有很多 object，图片等各种信息，早期 http**一次一个**，效率很低
    - 办法：**同时**发送多个请求；一个 TCP**传输更多信息**
    - 小文件延时（传输时间忽略）Tip 一个 RTT 是一个来回
    - 逐个获取 **2 nRTT**
    - 并发获取（m 个并发连接）**2[n/m]RTT**
    - 持久连接（一个 TCP 一次获取一个，HTTP 1.1 引入）**(n+1) RTT**
    - 流水线传输（一个连接，一次全部获取） **2 RTT**
    - 流水线传输与持久连接：首次 **2 RTT**，之后 **RTT**
    - 大文件延时（忽略 RTT）
    - 逐个获取**nF/B**
    - 并发获取 **[n/m]F/B**（前提是多个 TCP 时总带宽增加）
    - 流水线传输和/或持久连接**nF/B**



