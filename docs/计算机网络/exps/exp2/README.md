![[Pasted image 20250319114138.png]]
在 LISTEN 的状态处理中，创建子 socket,  并设置其成员**parent** 为服务端的 socket
- Parent 用于管理父 sock 和子 sock，在 accept 中很好用，它界定了监听的总 sock 和具体处理请求的 sock 关系

!! Listen 发生在 Tcp 已经收到了... 之后！状态转移不是让你转移到 LISTEN！
这部分建立子 sock 已经做了
建立子 sock 完成 2025年3月19日20:39:29.
![[ec36ae64f123a6022a4059c19a91a300.png]]
# TCP state machine
## 阻塞与唤醒
- `Connect`：发送 `SYN` 包后 `sleep_on()`，收到 `SYN|ACK` 后被 `wake_up()`
- `Accept`：调用 `accept()` 时 `sleep_on()`，收到 `ACK` 后被 `wake_up()`
## State machine
TCP 状态转移图：
![[TCPIP_State_Transition_Diagram.pdf#page=2|400]]
## My Function
本实验中我需要实现的部分：
对于**被动连接（服务器端）**，调用 listen 后，socket 的状态会从 TCP_CLOSED 转到 TCP_LISTEN；

 **而对于主动连接（客户端）**，调用 connect 后，socket 的状态会从 TCP_CLOSED 转到 TCP_SYN_SENT。这两种状态转移分别代表服务器等待连接和客户端主动发起连接的过程。
![[Pasted image 20250315203829.png|700]]


**连接过程**：四次握手（Hi）

断开连接：四次挥手（Bye）
![[Pasted image 20250317115811.png|400]]
```c
void tcp_process(struct tcp_sock *tsk, struct tcp_cb *cb, char *packet);
```
参数理解：
- `tcp_sock *tsk`: tcp_sock，抽象出来的协议控制
- `tcp_cb *cb`: control block，是将 tcp 连接中有用的信息（如 server,  client 的 ip 和端口、状态）集成起来了。关于 packet 的信息都在里面。
	- control block, representing all the neccesary information of a packet

## How to do this?
状态转移图中的**方块**中的内容是 **TCP_STATE**
转移线上的内容如 FIN/ACK 等是控制块中存储的包的信息，具体存在：
```c
// control block, representing all the neccesary information of a packet

struct tcp_cb {
    u32 saddr;      // source addr of the packet
    u32 daddr;      // source port of the packet
    u16 sport;      // dest addr of the packet
    u16 dport;      // dest port of the packet
    u32 seq;        // sequence number in tcp header
    u32 seq_end;        // seq + (SYN|FIN) + len(payload)
    u32 ack;        // ack number in tcp header
    u32 rwnd;       // receiving window in tcp header
    u8 flags;       // flags in tcp header
    struct iphdr *ip;       // pointer to ip header
    struct tcphdr *tcp;     // pointer to tcp header
    char *payload;      // pointer to tcp data
    int pl_len;     // the length of tcp data

};
```
的 flags 中.. 即 tcp 访问头

## 思考 tcp_process 需要完成什么...
根据实验文档所说
> 同学们需要仔细阅读实验的工程文件，在此基础上完善⼀个基本的 TCP 协议栈，包括：
	- 实现 TCP socket 的 API
	- 实现 TCP 建立和断开连接的状态转移逻辑
	- 实现 TCP 接收/发送数据包的处理过程
	- 实现应用层的短消息收发功能，对协议栈进行测试

> [!info] 5）接收数据包后的处理流程
	- 检查 `TCP` 校验和是否正确
	- 检查是否为 `RST` 包，如果是，直接结束连接
	- 检查是否为 `SYN` 包，如果是，进行建立连接管理
	- 检查 ack 字段，对方是否确认了新的数据
    - 本次实验中只有 `SYN` 和 `FIN` 包会确认新数据
	- 检查是否为 `FIN` 包，如果是，进行断开连接管理

和检查校验和函数已经被完成了，见 tcp. C line 69
```c
void handle_tcp_packet(char *packet, struct iphdr *ip, struct tcphdr *tcp)
{
    if (tcp_checksum(ip, tcp) != tcp->checksum) {
        log(ERROR, "received tcp packet with invalid checksum, drop it.");
        return ;
    }
  
    struct tcp_cb cb;
    tcp_cb_init(ip, tcp, &cb);

    struct tcp_sock *tsk = tcp_sock_lookup(&cb);

    tcp_process(tsk, &cb, packet);
}
```
那么 tcp_process 函数可以参照状态转移图和这个要求接着做 ```
- 检查是否为 `RST` 包，如果是，直接结束连接
- 检查是否为 `SYN` 包，如果是，进行建立连接管理
- 检查 ack 字段，对方是否确认了新的数据
- 本次实验中只有 `SYN` 和 `FIN` 包会确认新数据
- 检查是否为 `FIN` 包，如果是，进行断开连接管理


## TCP Life Cycle
### 建立连接
#### 关于 ip

服务端的传输层在本实验中不需要知道自己的ip，它在bind时使用 `0.0.0.0`，即linux中的 `INADDR_ANY`。当一个SYN报文到达时，网络层会检查目的ip是否是自己设备上的ip之一（见 `handle_ip_packet` 函数），如果是则传递给传输层，因而传输层可以通过 SYN 的目标地址确定子套接字的源 ip。


### 断开连接
`tcp_sock_close` 函数需要在关闭连接的同时正确地管理 TCP 状态转换，并最终释放相关资源。当前实现的问题是它在发送 FIN 报文后直接释放了套接字资源，而实际上资源的释放应该延迟到连接完全关闭时（即 `TCP_STATE` 到达 `TCP_CLOSED` 时）。

---

#### **TCP 连接关闭的状态流程**

根据 TCP 协议规范（四次挥手过程），关闭连接的典型流程如下：

1. **应用程序调用关闭**：
    - 如果本端主动关闭，发送 `FIN` 报文并进入 `TCP_FIN_WAIT_1` 状态。
    - 等待对方发送 `ACK`。
2. **接收对方的 `ACK`**：
    - 进入 `TCP_FIN_WAIT_2` 状态。
    - 等待对方发送 `FIN`。
3. **接收对方的 `FIN`**：
    - 发送 `ACK`，进入 `TCP_TIME_WAIT` 状态。
    - 在 `TIME_WAIT` 定时器超时后，进入 `TCP_CLOSED` 状态。
    - 这部分关于计时器的具体实现：见 tcp_timer.c
	    - `tcp_set_timewait_timer`：在TCP进入TIME_WAIT状态时，设置定时器并将其加入 `timer_list` 尾部
4. **资源释放**：
    - 只有在 `TCP_CLOSED` 状态下，才能安全释放资源。

---
---

#### **完整的资源释放逻辑**

- **主动关闭时**：调用 `tcp_sock_close`，发送 `FIN` 并进入 `TCP_FIN_WAIT_1`，由状态机驱动连接关闭过程。
- **被动关闭时**：状态机处理对方的 `FIN`，最终进入 `TCP_CLOSED`。
- **资源释放**：在状态转换到 `TCP_CLOSED` 时调用 `free_tcp_sock(tsk)`。

---

注意事项

- **`RST` 报文**：如果由于异常情况需要立即关闭连接，可以发送 `RST` 报文，并跳过正常的关闭流程。
- **状态机驱动**：大多数资源释放和状态转换应该由 `tcp_process` 函数驱动，而不是在 `tcp_sock_close` 中直接完成。
- **定时器管理**：`TIME_WAIT` 是关闭流程中重要的一部分，需要通过定时器机制处理。

# 新的体会
---
这里我有新的收获：在分别在 h 1, h 2 运行 tcp_stack（以 server 和 client 身份），我理解 tcp_process 实际是客户端和服务端收发包及状态转移的共同的处理。同时在这里需要按照 [[#State machine]] 部分的内容，完善 send what? Do what? 的逻辑. 
- [x] 完成状态转移函数的修改


### 主动链接和被动链接
- 被动建立连接（Server 端，被动监听）
    - 申请占用一个端口号 （`bind` 操作）
    - 监听该端口号 （`listen` 操作）
    - 收到SYN数据包 -> `TCP_SYN_RECV` （`accept` 操作）
    - 回复 `ACK` 并发送 `SYN` 数据包
    - 收到ACK数据包 -> `TCP_ESTABLISHED`
- 主动建立连接（Client 端，主动发送）
    - 发送目的端口的SYN数据包 -> `TCP_SYN_SENT` （`connect` 操作）
    - 收到 `SYN` 数据包（设置 `TCP_ACK` 标志位）
    - 回复 `ACK` 数据包 -> `TCP_ESTABLISHED`
# 编译运行
1. 输入 sudo python3 tcp_topo.py 来运行
	1. 这一步发现报错：Terminal 说我的 scripts 文件无法运行，需要 `chmod +x $script_name` 来运行，经过一番调试可以进入 mininet.
	2. 关于 [How to Make Script Executable in Linux | chmod Command - GeeksforGeeks](https://www.geeksforgeeks.org/chmod-command-linux/) 的知识可以看这个网站。
2. ![[Pasted image 20250316154838.png|500]] 成功进入 mininet
3. 运行终端命令：脚本文件，遇到 Linux 和 windows 换行符不兼容问题：
	1. /bin/bash^M: bad interpreter: No such file or directory（windows 换行符^M 被识别错误）
	2. 解决方案：查找 [newline - Bash script – "/bin/bash^M: bad interpreter: No such file or directory" - Stack Overflow](https://stackoverflow.com/questions/14219092/bash-script-bin-bashm-bad-interpreter-no-such-file-or-directory) 得到解决。具体解决方案为在终端输入：
```bash 
sed -i -e 's/\r$//' yourscriptname.sh
```
4. 开始测试
```bash 
# 主机h1 server执行命令如下： 
dump 
# 查看主机h1 h2的pid号 
h1 ./scripts/disable_tcp_rst.sh 
# 执行两个脚本禁止协议栈相应功能 
h1 ./scripts/disable_offloading.sh 
h1 ./tcp_stack server 10001 
# 主机h2 client执行命令如下： 
sudo mnexec -a 26831 ./scripts/disable_tcp_rst.sh 
# 这里的pid是h2的pid号 
sudo mnexec -a 26831 ./scripts/disable_offloading.sh 
sudo mnexec -a 26831 ./tcp_stack client 10.0.0.1 10001
```
这个测试是测试链接的建立：
- 在 h1 节点:
- ![[Pasted image 20250316164312.png|500]]
- 在 h2 节点：
- ![[Pasted image 20250316164337.png|500]] 可以发现 client 的 ip 没有理想的设置：
	- 定位到是 tcp_sock_connect 的问题，将其改为：
`IP` 地址获得方法

```c
// Step 2: Set source address (from routing table) and bind the port

    tsk->sk_sip = longest_prefix_match(ntohl(skaddr->ip))->iface->ip;
```
就解决了问题。
**这里要注意**`int tcp_sock_connect(struct tcp_sock *tsk, struct sock_addr *skaddr)` 中的 skaddr 是一个 network order 的 ip，需要转化。具体用 ntohl. (network to host long)
Port 用 ntohs (network to host short)

### 预期结果
![[Pasted image 20250319002255.png]]

---
### -BUG：

![[Pasted image 20250319214929.png]]
新的 socket 没有和客户端正确建立联系。准确的说，new_tsk 可以正常给 client 发包，但是 client 还是发给了监听服务器.
**思路：** 在 tcp_process 中路由到正确的 tsk，具体而言：先在 established_table中查找，再在 listen_table中查找
具体 tcp_sock.c 中实现了struct tcp_sock *tcp_sock_lookup(struct tcp_cb *cb)可以用
- [x] 更正这个 bug

---

### **状态转换图（简要总结）**

1. **客户端主要路径**  
    `CLOSED -> SYN_SENT -> ESTABLISHED -> FIN_WAIT_1 -> FIN_WAIT_2 -> TIME_WAIT -> CLOSED`
    
2. **服务端主要路径**  
    `CLOSED -> LISTEN -> SYN_RECEIVED -> ESTABLISHED -> CLOSE_WAIT -> LAST_ACK -> CLOSED`
    

---

### **重点区分：**

- 客户端独有的状态：`SYN_SENT`, `FIN_WAIT_1`, `FIN_WAIT_2`, `TIME_WAIT`
- 服务端独有的状态：`LISTEN`, `SYN_RECEIVED`, `LAST_ACK`
- 共有的状态：`CLOSED`, `ESTABLISHED`, `CLOSING`


# ECHO
## 信息收发

## Server Client 逻辑重写
需要重写 tcp_apps.c 中的 server, client 逻辑
这部分参照代码: 
```python
import sys
import string
import socket
from time import sleep 

data = string.digits + string.ascii_lowercase + string.ascii_uppercase

def server(port):
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('0.0.0.0', int(port)))
    s.listen(3)
    cs, addr = s.accept()
    print(addr)
    while True:
        data = cs.recv(1000)
        if data:
            data = "server echoes: " + data.decode()
            cs.send(data.encode())
        else:
            break
    s.close()


def client(ip, port):
    s = socket.socket()
    s.connect((ip, int(port)))
    for i in range(3):
        new_data = data[i:] + data[:i]
        s.send(new_data.encode())
        print(s.recv(1000).decode())
        sleep(1)
    s.close()

if __name__ == '__main__':
    if sys.argv[1] == 'server':
        server(sys.argv[2])
        
    elif sys.argv[1] == 'client':
        client(sys.argv[2], sys.argv[3])
```


实现：sock_write 函数有问题。滑动窗口没有正确更新，导致一直没有 write 进去，sock_read 也 read 不到. client 直接关闭了

要点：代码框架已经实现了更新 snd_wnd 的逻辑，所以我们要在 `tcp_process` 函数中，`TCP_ESTABLISHED` case 中更新。

> [!Note]
> 不要混淆监听 sock `tsk` 和真正连接处理信息的 `csk`


`tcp_process` 接受到 ACK 再 `tcp_sock_write`，需要的参数都封装在 `tcp_control_block cb`

server: 
- 开始读数据
	- 发现 buffer 为空
	- 等待收到 Packet(在 tcp_process ACK)中唤醒

现在服务器可以收到包了，但是包的数据顺序是乱的，应该是序列号更新问题（从哪里开始是数据？）.

> [Tip]
> 注意：`tcphdr` 按二进制记位，对于 buffer 要计算其位数，所以 `strlen` 是不合适的，应该用 `len`



日志
---
2025年3月21日19:14:19 完成了基本信息收发 echo!!!!!

manage with sleep and wake
![[Pasted image 20250321201020.png]]


> [!note] 
> rcv_wnd 是一个 16 位的 2 进制数 `u16`,超过 65565 会溢出到 0！

解决了 rcv_wnd 的问题，就解决了阻塞. （2025年3月21日20:38:40）

> [!note] 
> 一定要用实现的，带有互斥锁的 read 函数来读数据，否则会遇到 shared resources 冲突的问题


read 时候发现差几个字母，debug 后发现是读不能只读 `base_str` 的长度，还要加上返回的 `server echoes` 的长度. 

```c
char echo_str[1024];
        int len = tcp_sock_read(tsk, echo_str, sizeof(echo_str) - 1);

        if(len<=0){
            log(ERROR, "read echo failed");
        }
        tcp_sock_read(tsk, echo_str, strlen(echo_str)+strlen("server echoes: "));

        echo_str[len] = '\0';  // Null-terminate for safe string operations
```

# 抓包
可以利用 `wireshark` 抓包分析
抓包指令：
```bash
h1 tcpdump -i h1-eth0 -s0 -U -w ./packetcaught/dump_c2c01.pcap &
```

```bash
h1 tcpdump -i h1-eth0 -s0 -U -w ./packetcaught/dump_py2c01_loss.pcap &
```


## py server 2 c socket

c socket 回显
可以看到**连接**可以正常唤醒，但是 `client`  ESTABLISHED 之后似乎没有正常的发送 ACK

![[Pasted image 20250323000957.png]]

![[Pasted image 20250323001911.png]] ![[Pasted image 20250323005151.png]] ^[异常抓包：Ack 异常]

**修改办法**: 在 `tcp_process` 函数中，根据 `cb->seq` 动态更新序列号

简单来说，`tsk->rcv_nxt` 更新逻辑如下：
- 接收到 `SYN`，表达连接请求，更新为 `seq+1`
- 接收到不包含 `data` 的 `ACK`，表达握手过程，且不包含新信息，保持 `seq` 不变
- 接收到 `FIN`，表达结束请求，更新为 `seq+1`
- 接收到包含有效信息的 `ACK` ，也就是进行 `write` 操作，更新为写入数据的大小


经过动态更新序列号后，可以正常完成双方的*握手* `handshake`

现在处理包偏移量不对的问题。经检查 `tcp_send_packet` 函数的逻辑，其传入参数 `packet` 应该初始化大小为：`ETHER_HDR_SIZE + TCP_BASE_HDR_SIZE + IP_BASE_HDR_SIZE;`

解决这个问题和偏移量设置后，发现 `send` 数据终于正常设置了
![[Pasted image 20250323170554.png]]
现在问题是：由于 client 的休眠，所以其必须在进入休眠循环前接收到信息，否则 `sleep(1)` 是一个太长的时间，会导致 server超时重传 `Retransmission`

![[Pasted image 20250323215829.png]] 
代码发送之后，立刻去读，这样是读不到的，但是又进入了下一个循环，sleep 了 1 秒，就导致了矛盾。


在 `read` 中添加了检查为空时 `sleep_on(tsk->wait_recv)` 逻辑，不会出现合并数据包的情况，
![[Pasted image 20250324103442.png]]
但是仍有超时问题要解决.

> [!success] 通过更改 `read` 和 `write` 的休眠逻辑 超时问题已经解决！



# 成果
- [x] CEchoC
- [x] CEchoPython
- [x] PythonEchoC

于 2025 年 3 月 24 日完成了
