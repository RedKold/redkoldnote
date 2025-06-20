要在 Ubuntu 环境中完成实验目标，我们需要分为以下几个步骤实现一个支持 HTTP 和 HTTPS 的简单服务器。以下内容将包括分步指导和代码实现。

---

### **实验步骤**

#### **1. 安装环境和依赖**

在 Ubuntu 中准备开发环境：

1. **安装 GCC 和 Make 工具**：
    
    ```bash
    sudo apt update
    sudo apt install build-essential
    ```
    
2. **安装 OpenSSL 开发库**：
    
    ```bash
    sudo apt install libssl-dev
    ```
    

---

#### **2. 实现实验功能**

需要创建一个支持 HTTP 和 HTTPS 的服务器，以下是实现的分步说明：

---

### **HTTP 和 HTTPS 逻辑**

1. **HTTP 服务器 (80 端口)**：
    
    - 监听 80 端口。
    - 解析请求报文，并始终返回 `301 Moved Permanently` 状态码。
    - 在响应中添加 `Location` 字段，指向 `https://` 版本的 URL。
2. **HTTPS 服务器 (443 端口)**：
    
    - 使用 OpenSSL 初始化。
    - 监听 443 端口。
    - 支持以下逻辑：
        - **200 OK**：如果请求的文件存在，返回文件内容。
        - **206 Partial Content**：支持 `Range` 请求，返回部分内容。
        - **404 Not Found**：如果请求的文件不存在，返回错误。
    - 解析 HTTP 报文，提取请求路径、方法和字段。

---

#### **3. 项目代码实现**

以下是实现的完整代码框架。

---

##### **HTTP 线程：监听 80 端口**

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>

void* http_server(void* arg) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        perror("HTTP socket creation failed");
        exit(1);
    }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(80);

    if (bind(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("HTTP bind failed");
        exit(1);
    }
    listen(sock, 10);
    printf("HTTP server is running on port 80...\n");

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t addr_len = sizeof(client_addr);
        int client_sock = accept(sock, (struct sockaddr*)&client_addr, &addr_len);
        if (client_sock < 0) {
            perror("HTTP accept failed");
            continue;
        }

        char buffer[1024] = {0};
        read(client_sock, buffer, sizeof(buffer));

        // 301 Moved Permanently
        char* response = "HTTP/1.1 301 Moved Permanently\r\n"
                         "Location: https://127.0.0.1\r\n"
                         "Content-Length: 0\r\n\r\n";
        write(client_sock, response, strlen(response));
        close(client_sock);
    }

    close(sock);
    return NULL;
}
```

---

##### **HTTPS 线程：监听 443 端口**

```c
#include <openssl/ssl.h>
#include <openssl/err.h>

void handle_https_request(SSL* ssl) {
    char buffer[1024] = {0};
    if (SSL_read(ssl, buffer, sizeof(buffer)) <= 0) {
        perror("SSL_read failed");
        return;
    }

    // 解析 GET 请求
    char method[16], path[256];
    sscanf(buffer, "%s %s", method, path);
    if (strcmp(method, "GET") != 0) {
        SSL_write(ssl, "HTTP/1.1 405 Method Not Allowed\r\n", 32);
        return;
    }

    // 去掉请求路径的 "/"
    char* file_path = path + 1;

    FILE* file = fopen(file_path, "rb");
    if (!file) {
        // 404 Not Found
        char* response = "HTTP/1.1 404 Not Found\r\n"
                         "Content-Length: 0\r\n\r\n";
        SSL_write(ssl, response, strlen(response));
    } else {
        // 200 OK
        fseek(file, 0, SEEK_END);
        long file_size = ftell(file);
        fseek(file, 0, SEEK_SET);

        char response[1024];
        sprintf(response, "HTTP/1.1 200 OK\r\n"
                          "Content-Length: %ld\r\n\r\n", file_size);
        SSL_write(ssl, response, strlen(response));

        char file_buffer[1024];
        int bytes_read;
        while ((bytes_read = fread(file_buffer, 1, sizeof(file_buffer), file)) > 0) {
            SSL_write(ssl, file_buffer, bytes_read);
        }
        fclose(file);
    }
}

void* https_server(void* arg) {
    SSL_library_init();
    SSL_load_error_strings();
    OpenSSL_add_all_algorithms();

    const SSL_METHOD* method = TLS_server_method();
    SSL_CTX* ctx = SSL_CTX_new(method);

    // 加载证书和私钥
    SSL_CTX_use_certificate_file(ctx, "./keys/server.crt", SSL_FILETYPE_PEM);
    SSL_CTX_use_PrivateKey_file(ctx, "./keys/server.key", SSL_FILETYPE_PEM);

    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(443);

    bind(sock, (struct sockaddr*)&addr, sizeof(addr));
    listen(sock, 10);
    printf("HTTPS server is running on port 443...\n");

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t addr_len = sizeof(client_addr);
        int client_sock = accept(sock, (struct sockaddr*)&client_addr, &addr_len);

        SSL* ssl = SSL_new(ctx);
        SSL_set_fd(ssl, client_sock);
        if (SSL_accept(ssl) <= 0) {
            SSL_free(ssl);
            close(client_sock);
            continue;
        }
        handle_https_request(ssl);
        SSL_free(ssl);
        close(client_sock);
    }

    close(sock);
    SSL_CTX_free(ctx);
    return NULL;
}
```

---

##### **主函数：创建两个线程**

```c
#include <pthread.h>

int main() {
    pthread_t http_thread, https_thread;

    pthread_create(&http_thread, NULL, http_server, NULL);
    pthread_create(&https_thread, NULL, https_server, NULL);

    pthread_join(http_thread, NULL);
    pthread_join(https_thread, NULL);

    return 0;
}
```

---

### **4. 编译和运行**

1. 编译程序：
    
    ```bash
    gcc -Wall -o server server.c -lssl -lcrypto -lpthread
    ```
    
2. 运行程序：
    
    ```bash
    sudo ./server
    ```
    
3. 测试：
    
    - 用浏览器访问 `http://127.0.0.1`，应返回 `301 Moved Permanently`。
    - 用浏览器访问 `https://127.0.0.1`，可下载或查看文件内容。

---

### **文件说明**

- `server.c`: 上述代码。
- `keys/server.crt` 和 `keys/server.key`: 需要提前生成或获取的 SSL 证书和私钥。

# 一些问题
**我**： tell me everything about coding socket on linux ubuntu
**ChatGPT 说：**

Socket programming on Linux (including Ubuntu) involves creating, binding, listening to, and communicating over sockets, which are endpoints for network communication. Below is a complete guide to understanding and working with sockets on Linux:

---

### **Basics of Socket Programming**

1. **Socket**: A socket is an abstraction representing a communication endpoint. It allows communication between two processes (on the same or different machines) over a network.
2. **Types of Sockets**:
    - **Stream Sockets (`SOCK_STREAM`)**: Provide reliable, connection-oriented communication (e.g., TCP).
    - **Datagram Sockets (`SOCK_DGRAM`)**: Provide unreliable, connectionless communication (e.g., UDP).
3. **Protocol Families**:
    - **IPv4 (`AF_INET`)**: Used for internet communication over IPv4.
    - **IPv6 (`AF_INET6`)**: Used for internet communication over IPv6.
    - **UNIX (`AF_UNIX`)**: Used for interprocess communication (IPC) on the same machine.

---

### **Key Steps in Socket Programming**

1. **Create a Socket**: Use `socket()` to create a socket.
2. **Bind the Socket**: Use `bind()` to associate the socket with an IP address and port.
3. **Listen (Server)**: Use `listen()` to prepare the socket to accept incoming connections.
4. **Connect (Client)**: Use `connect()` to establish a connection to the server.
5. **Accept Connections (Server)**: Use `accept()` to accept an incoming connection.
6. **Send/Receive Data**: Use `send()`, `recv()`, or similar functions to exchange data.
7. **Close the Socket**: Use `close()` to release the socket resource.

---

### **Linux System Calls for Sockets**

|**Function**|**Description**|
|---|---|
|`socket()`|Creates a socket and returns a file descriptor.|
|`bind()`|Binds the socket to a specific IP address and port.|
|`listen()`|Marks the socket as a passive socket to accept incoming connections.|
|`accept()`|Accepts a new connection on a socket. Returns a new socket for the connection.|
|`connect()`|Initiates a connection on a socket (used by clients).|
|`send()`|Sends data on a connected socket.|
|`recv()`|Receives data from a connected socket.|
|`close()`|Closes the socket file descriptor.|
|`select()`|Monitors multiple sockets for readability, writability, or exceptions (used for multiplexing).|
|`poll()`|Similar to `select()`, monitors multiple sockets.|
|`epoll()`|Advanced version of `select()` for efficient I/O multiplexing.|

---
# 解读示例程序
### **1. The C File: `https-server-example.c`**

This program implements a basic HTTPS server using OpenSSL. Here's the step-by-step breakdown:

#### **Key Features**

- **SSL Initialization**:
    
    - It initializes OpenSSL by loading algorithms and error strings.
    - Configures the server to use TLS (Transport Layer Security) with `TLS_server_method()`.
- **Certificate and Private Key**:
    
    - The server loads an SSL certificate (`cnlab.cert`) and private key (`cnlab.prikey`) from the `./keys/` folder.
    - These files are required to establish a secure HTTPS connection.
- **Socket Setup**:
    
    - Creates a TCP socket (`socket()`) to listen on port 443 (default HTTPS port).
    - Uses `setsockopt()` to allow reusing the port after restarting the server.
    - Binds the socket to any available network interface (`INADDR_ANY`) and the specified port.
- **Listening and Accepting Connections**:
    
    - The server listens for incoming connections with `listen()` and accepts them using `accept()`.
    - Each connection gets wrapped in an SSL session using `SSL_new()` and `SSL_set_fd()`.
- **Handling Requests**:
    
    - Reads data from the client using `SSL_read()`.
    - Sends back a hardcoded HTTP response using `SSL_write()`.
    - Releases resources (`SSL_free()` and `close()`) after handling the request.

---

### **How the Code Works**

1. Initialize OpenSSL and load the certificate/private key.
2. Set up a socket to listen for incoming connections.
3. For every new client:
    - Accept the connection.
    - Wrap the connection with SSL.
    - Handle the HTTPS request:
        - Read data from the client.
        - Send an HTTP response back.
    - Clean up after finishing the request.
4. Continue listening for new clients.