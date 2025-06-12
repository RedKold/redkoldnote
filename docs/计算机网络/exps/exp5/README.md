实验五要完成路由器转发实验。
回顾知识：[[网络层 Network Layer]]

## 重要数据结构
### 路由表
def in `rtable.h`
```c
struct list_head rtable;    // 路由表，是一个链表头部伪节点
typedef struct {        
    struct list_head list;  // 链表实现
    u32 dest;               // 目的IP地址
    u32 mask;               // 网络掩码
    u32 gw;                 // 下一跳网关地址（如果目的IP和路由器端口在同一个子网中就是0）
    int flags;              // 转发表条目标识（可忽略）
    char if_name[16];       // 转出端口名字, e.g. r1-eth0
    iface_info_t *iface;    // 转出端口
} rt_entry_t;  // 路由表条目
```

### ARP 缓存表
def in `arpcache.h`
```c
// ARP缓存表
typedef struct {
    struct arp_cache_entry entries[32];  // IP->MAC映射，最多存储32条
    struct list_head req_list;           // 链表头，存着等待ARP Reply的IP列表，指向arp_req
    pthread_mutex_t lock;                // ARP缓存表查询、更新时需要的锁
    pthread_t thread;                    // 清理ARP缓存表用的的线程
} arpcache_t;

// IP->MAC映射
struct arp_cache_entry {
    u32 ip4;            // IP地址，主机序
    u8 mac[ETH_ALEN];   // IP地址对应的MAC地址
    time_t added;       // 添加时间
    int valid;          // 是否仍然有效，若超时应设置为0
};

// 第一层链表节点，每个arp_req代表着一个packet集合，它们的目标IP相同，但不知道MAC地址
struct arp_req {
    struct list_head list;  // 第一层链表节点
    iface_info_t *iface;    // 转发数据包的端口
    u32 ip4;                // 等待ARP Reply的IP地址
    time_t sent;            // ARP发送时间
    int retries;            // 重试次数

    // 链表头，缓存着相同目标IP但不知道MAC地址的packet集合，指向cached_pkt
    struct list_head cached_packets;
};

// 第二层链表节点，每个cached_pkt代表一个不知道MAC地址的被缓存了的packet
struct cached_pkt {
    struct list_head list;  // 第二层链表节点
    char *packet;           // packet
    int len;                // the length of packet
};
```

#### 从数据结构理解函数要干什么
**简单来说**，在缓存表中，存着两个关键的，在 `arpcache_sweep` 中会检测的数据结构，也就是我们遍历的 `entry`
- `arp_req`, 是 `req_list` 的 `entry`，其中缓存着一系列具有相同 IP 地址但是不知道 MAC 的包
- `arp_cache_entry`, 是 `struct arp_cache_entry entries[32]` 的 `entry`，是一个已经构造好的 `IP->MAC` 的映射。

### 数据包头部
def in `arp.h`, `ether,h`, `icmp.h`, `ip.h`
1. ARP 数据包头部在 `ether_arp`
2. 以太网帧头部 `ether_header`
3. ICMP 数据包头部 `icmphdr`
4. IP 报文头部 `iphdr`

### 理解 ARP 头
- `arp_hdr->arp_tpa`：目标IP地址。
    
- `arp_hdr->arp_sha`：发送方的MAC地址。
    
- `arp_hdr->arp_spa`：发送方的IP地址。
    
- `arp_hdr->arp_tha`：目标的MAC地址。
为什么需要检测ARP 和 iface 的 dest ip 是否一样？
要理解 **ARP**广播的意义。即ARP 广播目标是找到一个IP 地址对应的MAC 地址。不同设备接收到广播会检查 `arp_tpa` 是和自己的 `iface-ip` 匹配情况

### 理解 arp 缓存表
 `arpcache_t`是完整的arp缓存表，里边的`req_list`是一个链表，它的每个节点(用`arp_req`结构体封装)里又存着一个链表头，这些二级链表(节点类型是`cached_pkt`)缓存着相同目标ip但不知道mac地址的包

---

`iface` 通常表示网络接口（Network Interface），在代码中通过 `iface_info_t` 结构体来表示。一个网络接口代表主机上的某个网卡或者虚拟网络设备。它包括一些关键信息，比如：

- **IP地址 (`iface->ip`)**：网络接口的IP地址。
    
- **MAC地址 (`iface->mac`)**：网络接口的MAC地址。
    
- **接口名称**：例如 `eth0` 或 `wlan0`。
    
- **其他属性**：如子网掩码、链路状态等。

### 理解 ICMP 数据包格式
![[ICMP-hdr.png]]
1. 这里图片画的有些问题，`Rest of ICMP Header`实际没有这么大，之后仅4字节，详细定义可在`icmp.h`文件中的`icmphdr`结构体中找到。
2. ICMP数据包是有**主体部分**的，对于ICMP Error Packet，主体部分拷贝发生错误的数据包的IP头部（>=20字节）加**随后的8字节**。对于ICMP EchoReply Packet，除了 `Type, Code, Checksum`，都拷贝ICMP EchoRequest Packet中的相应字段
	1. 这就是为什么说实现函数 `icmp_send_packet` 要分别 `alloc` 内存。
3.  以上数字无需记忆，在在 `icmp.h 文件中均有宏定义
4. `code` 字段在正常传输时设置为 `0`，不需要关心。只有在超时、不可达时会有说明具体原因。
5. 关于 `type` 和 `code` 的具体响应，参照
	1. 路由表查找失败
	    `Type`：3
	    `Code`：0
	    `Checksum`：使用`icmp.h`文件中的`icmp_checksum`进行更新，注意更新`Checksum`的时机
	    `Rest of ICMP Header`： 还剩4字节，均设置为0
	    
	    主体部分：拷贝发生错误的数据包的IP头部（>=20字节）+ 随后的8字节
	    
	2. ARP Request失败
	    
	    `Type`：3
	    
	    `Code`：1
	    
	    `Checksum`：同上
	    
	    `Rest of ICMP Header`：同上
	    
	3. TTL值减为0
	    
	    `Type`：11
	    
	    `Code`：0
	    
	    `Checksum`：同上
	    
	    `Rest of ICMP Header`：同上
	    
	4. 收到Ping本端口的数据包（ ICMP EchoRequest Packet，头部Type为8 ）
	    
	    `Type`：0
	    
	    `Code`：0
	    
	    `Checksum`：同上
	    
	    `Rest of ICMP Header`以及主体内容：拷贝Ping包中的相应字段
#### 如何得到 ICMP 数据包？
在 `ip.h` 中定义，可以用
```c
// You can use struct icmphdr *icmp = (struct icmphdr *)IP_DATA(ip); in ip.h to get the icmp header in a packet.
struct icmphdr *icmp = (struct icmphdr *)IP_DATA(ip) //ip is a iphdr
```

## 工作流
![[Pasted image 20250511142113.png]]
可以从上到下依次完成函数

### ARP 协议数据包结构

![[ARP-protocols.png]]
**一些特殊情况：**
1. est Ether Addr：当为ARP Request，即MAC地址未确定时，写入 `FF: FF: FF: FF: FF: FF`，广播包。
	1. 我打算这样做 
```c
u8 broad_cast_mac[ETH_ALEN]={0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
memcpy(arp_hdr->arp_tha, broad_cast_mac, ETH_ALEN);
```
1. ARP Operation Type：`0x01 为ARP Request，，` 0x02 为ARP Reply。。
2. Target HW Addr：当为ARP Request时，Target HW Addr置空。

## 需要实现的函数
```c
// 如果ARP数据包的目标IP地址与收到它的接口的IP地址不相等，则丢弃它
// 否则，如果是ARP Request数据包，则发送ARP Reply数据包，并插入该数据包的IP->MAC映射
//      如果是ARP Reply数据包，则插入该数据包的IP->MAC映射
// 需要用到部分主机序、网络序转换的库函数，已经写在实验代码的注释中了
void handle_arp_packet(iface_info_t *iface, char *packet, int len)

// 封装ARP Reply数据包，并发送出去
void arp_send_reply(iface_info_t *iface, struct ether_arp *req_hdr)

// 封装ARP Request数据包，并发送出去
void arp_send_request(iface_info_t *iface, u32 dst_ip)

// 查找IP->MAC映射，需要上锁
// 遍历ARP缓存表以查找是否存在与给定IP地址相同的IP->MAC映射条目
// 返回值是true/false，查找成功的MAC地址保存在u8 mac[ETH_ALEN]中
int arpcache_lookup(u32 ip4, u8 mac[ETH_ALEN])

// 将IP->MAC映射插入到arpcache中，需要上锁
// 如果ARP缓存表中存在超时条目(valid = 0)，就替换它
// 如果ARP缓存表中不存在超时条目，就随机替换一个
// 如果有等待此IP->MAC映射的待发送数据包，则为每个数据包填充以太网头，并将其发送出去
void arpcache_insert(u32 ip4, u8 mac[ETH_ALEN])

// 在存储待处理数据包的链表中查找，如果已存在需要相同IP->MAC映射的条目，
// 这说明已经发送过有关ARP Request，只需将该数据包附加到该条目链表的末尾（该条目可能包含多个数据包）
// 否则，malloc一个新条目，在其链表上附加数据包，并发送ARP Request
void arpcache_append_packet(iface_info_t *iface, u32 ip4, char *packet, int len)

// 每一秒扫描一次arpcache
// 对于每个IP->MAC映射，如果该条目在ARP缓存表中已存在超过15秒，则将其valid属性置为0
// 对于正在进行ARP Request的条目，如果1秒前发出过一次请求，但仍未收到答复，则重传并将重传计数+1
// 如果重传次数已达五次而未收到ARP Reply，则对每个待处理数据包的源IP地址，
// 发送ICMP Error Packet (DEST_HOST_UNREACHABLE)，并丢弃这些数据包
// 注意，在arpcache_append_packet第一次发送ARP Request时，就算做一次重传，
// 所以这里与其理解为重传，不如理解为发送ARP Request的次数
void *arpcache_sweep(void *arg)

// 如果是ICMP EchoRequest数据包，并且目标IP地址等于收到它的接口的 IP 地址，则发送ICMP EchoReply数据包
// 否则，转发数据包
// 需要用到获得IP头部、ICMP头部的宏定义，已经写在实验代码的注释中了
void handle_ip_packet(iface_info_t *iface, char *packet, int len)

// 转发数据包时，需要检查TTL，更新checksum和TTL
// 然后通过longest_prefix_match确定转发数据包的下一跳和接口，无法确定则要发送ICMP Error Packet
// 最后，通过iface_send_packet_by_arp发送数据包
// 请仔细思考checksum的更新时机，以及需要通过路由表表项属性entry->gw判断下一跳是目标host还是下一个子网
void ip_forward_packet(u32 ip_dst, char *packet, int len)

// 在路由表中查找，找到具有相同且最长前缀的条目
// 输入IP地址为主机序，应该在handle_ip_packet就转换成主机序了
// 路由表是全局变量rtable，定义在rtable.c中
rt_entry_t *longest_prefix_match(u32 dst)

// 1.处理发送给路由器自身的 icmp 数据包（ICMP ECHO REPLY）
// 2.当发生错误时，发送 icmp 错误数据包。
// 注意，这两个icmp数据包的结构不同，需要malloc不同大小的内存。
// 以及，包中有些字段可能在前几个函数中已经被转换成主机序了，但不要忘记仍有部分字段需要转换
// 注意更新checksum的时机，以及可以利用ip_base.c中定义的ip_init_hdr来初始化ip头部
// ip.h/icmp.h中定义了一些函数和宏，说不定有用
void icmp_send_packet(const char *in_pkt, int len, u8 type, u8 code)

// 与ip_forward_packet函数不同，ip_send_packet发送的是由路由器自身产生的数据包
// 本实验中该函数仅用于发送ICMP数据包，但总体实现与ip_forward_packet类似
// 你可以在完成icmp_send_packet之后再完成该函数，也可以直接将该函数的功能集成到icmp_send_packet中
// 发送数据包的接口由longest_prefix_match指定
// 如果icmp_send_packet中更新过checksum和TTL了就不需要在该函数中更新了
void ip_send_packet(char *packet, int len)

// 在ARP缓存表中查找目标IP的MAC地址
// 如果找到，则填充以太网帧头部并通过iface_send_packet函数发送数据包
// 否则，将此数据包挂入arpcache并发送ARP Request
void iface_send_packet_by_arp(iface_info_t *iface, u32 dst_ip, char *packet, int len)
```


## 路由器转发流程
路由表转发流程如下（IP 侧）：

1. 给定数据包，提取该数据包的IP头部。
    
2. 对IP头部的TTL值进行减一操作，如果该值 <= 0，则将该数据包丢弃，并回复ICMP Error Packet（ICMP_TIME_EXCEEDED）。
	1. 这部分在 `ip.c` 中
    
3. IP头部数据已经发生变化，需要重新设置checksum。
    
4. 遍历路由表，使用最长前缀匹配查找相应条目，可能会出现三种情况（下文提到的MAC地址在一个子网内转发数据包时起作用）：
    
    1. 找**不到任何路由表项**：发送ICMP Error Packet（ICMP_DEST_UNREACH）。
    2. 路由器端口IP与目的IP地址在同一网段：转发到相应端口，寻找目的IP对应的MAC地址。
    3. 路由器端口IP与目的IP地址不在同一网段：转发到相应端口，寻找下一跳路由器的MAC地址。
    
    这里判断路由器端口IP与目的IP地址是否在同一网段可用路由表表项实现`rt_entry_t`结构体中的`gw`属性判断，该结构体定义在`rtable.h`文件中。

## ARP 缓存流程
### ARP缓存操作

1. 查找`IP->MAC`映射
    1. 如果在ARP缓存表(`arpcache_t`)中找到有关映射，就填充数据包的目的MAC地址，并转发该数据包。
    2. 否则，将该数据包缓存在ARP缓存表的等待队列 `req_list` 中（用链表实现），并发送ARP Request。
2. 收到新的`IP->MAC`映射
    1. 将该映射写入ARP缓存表中 ，如果ARP缓存表已满，则随机替换掉其中一个。
    2. 将ARP缓存表等待队列中等待该映射的数据包依次填入目的MAC地址并转发出去，再删掉相应缓存。
3. 同时每秒对ARP缓存表进行清理
    1. 如果一个缓存条目在缓存中已存在超过了15秒，则将该条目清除。
    2. 如果一个`IP对应的ARP Request`已经发送超过1秒，则重新发送ARP Request。
    3. 如果ARP Request发送超过5次仍未收到ARP Reply，则对等待该映射的数据包的源IP地址依次发送`ICMP Error Packet（Destination Host Unreachable）`，并删除等待的数据包。

对于查找，可以参考如下框架

```c 尝试做查找
	struct arp_cache_entry *entry = NULL;
	// 遍历缓存表，找到一个过期的entry
	int i;

	for (i = 0; i < MAX_ARP_SIZE; i++) {
		if (arpcache.entries[i].valid == 0) {
		entry = &arpcache.entries[i];
		break;
		}
	}
```
## 实验内容

### 准备工作
在系统上安装 `arptables, iptables, traceroute` 以满足实验要求
```bash
sudo apt install arptables iptables traceroute
```

### 实验 1
星形拓扑，定义在 `router_topo1.py`

- 编译
```bash
make clean
make
sudo python3 router_topo1.py
```
- 进行 ping 实验

```bash
h1 ping 10.0.1.1   # h1能够ping通r1
h1 ping 10.0.2.22  # h1能够ping通h2
h1 ping 10.0.3.33  # h1能够ping通h3
h1 ping 10.0.3.11  # 能够返回ICMP Destination Host Unreachable
h1 ping 10.0.4.1   # 能够返回ICMP Destination Net Unreachable
```

### 实验 2
链式拓扑
- 编译
```bash
make clean
make
sudo python3 router_topo1.py
```
- 进行 ping 实验

```bash
h1 ping 10.0.1.1   # h1能够ping通r1
h1 ping 10.0.2.2   # h1能够ping通h2
h1 traceroute h2   # 能够返回正确的路由
```

# Q&A
## MAC 地址是一个 `u8` 的 6 位数组，即 6 字节的内容，需要字节序转换吗？
**不需要**
### **关于 MAC 地址的字节序转换**

**不需要进行字节序转换**。MAC 地址是一个 48 位的标识符，通常按照固定的字节顺序存储，不受主机字节序和网络字节序的影响。

1. **存储方式**：
    
    - 在数据包中，MAC 地址以 6 个字节的形式存储。
        
    - MAC 地址的字节顺序就是它的物理字节顺序（通常为大端序）。
        
2. **为什么不需要转换**：
    
    - 网络字节序主要用于多字节的数据类型（如 16 位、32 位），因为不同平台（如小端和大端架构）可能对这些数据的字节顺序有不同的处理方式。
        
    - 然而，MAC 地址是由固定长度的字节组成，没有涉及到字节的顺序问题，因此不需要进行字节序转换。

## 协议号
协议号是以太网帧中 `EtherType` 字段的值，用来表示帧携带的上层协议类型。常见协议号：

- `0x0800`: IPv4
    
- `0x0806`: ARP
    
- `0x86DD`: IPv6


# 抓包
```bash
sudo tcpdump -i r1-eth0 icmp -w icmp_packets.pcap
```

```bash

sudo tcpdump -i h1-eth0 -w h1_packets.pcap

```
抓 arp 类型
```shell
sudo tcpdump -i r1-eth0 arp -w arp_packets.pcap

```
# BUG 记录
主机地址
```bash
h1-eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.0.1.11  netmask 255.255.255.0  broadcast 10.0.1.255
        ether c2:cc:05:f3:d9:f4  txqueuelen 1000  (Ethernet)
```
抓包发现，路由器收到了主机的包，但是没有做出回复。

r1 的 source 打印是 `fe:a8:74:e2:36:98`
和查看结果一致
```bash
r1-eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.0.1.1  netmask 255.255.255.0  broadcast 10.0.1.255
        ether fe:a8:74:e2:36:98  txqueuelen 1000  (Ethernet)
```
且发给的对方也是对的
```bash
[main.c:28] DEBUG: start handling arp packet
[arp.c:24] DEBUG: start handling the arp packet
[arp.c:41] DEBUG: coming ARP Request, sending Reply packet
[arp.c:59] DEBUG: sending arp reply packet
[arp.c:88] DEBUG: Sent ARP Reply to c2:cc:05:f3:d9:f4
```
之后就开始发 ip packet 了，猜测 request 没问题

调整字节序之后，结果正确。
```terminal
[main.c:28] DEBUG: start handling arp packet
[arp.c:26] DEBUG: start handling the arp packet
[arp.c:43] DEBUG: coming ARP Request, sending Reply packet
[arp.c:61] DEBUG: sending arp reply packet
[arp.c:92] DEBUG: Sent ARP reply to 10.0.1.11
[arp.c:96] DEBUG: Sent ARP Reply to c2:cc:05:f3:d9:f4
```

**调整完了，现在发 request 包**给到了
```
[arp.c:187] DEBUG: Sending ARP request for 10.0.1.1
[arp.c:134] DEBUG: sending the request packet by iface...
[arp.c:135] DEBUG: Sent ARP Request to 10.0.1.1
[arp.c:138] DEBUG: Sent ARP Request to ff:ff:ff:ff:ff:ff
[arp.c:141] DEBUG: packet sent
```
**但是**，`10.0.1.1` 是路由器的地址，而不是 `h1` 的地址。所以这里设置的有问题。


## 字节序转化问题
- `ip_init_hdr` 之中会做字节序转化，传入原始的 host-byte 即可
	- 且传入的 len 是 `ip_len`，不包括以太头

```bash
[main.c:20] DEBUG: got packet from r1-eth1, 98 bytes, proto: 0x0800

[main.c:24] DEBUG: start handling ip packet
[ip.c:32] DEBUG: dst IP: 10.0.1.11 is not equal to the IP address OR not ICMP echo request, forward it
[ip.c:44] DEBUG: forwarding the packet, dst ip is10.0.1.11
[arp.c:180] DEBUG: Sending packet from 10.0.1.1 to 10.0.1.11
[arp.c:182] DEBUG: MAC is from aa:4f:2d:b2:b3:bc to e2:59:bd:49:e6:1b
[device_internal.c:32] DEBUG: dst MAC is:e2:59:bd:49:e6:1b
[arpcache.c:251] DEBUG: sweeping the arpcache cache table
[main.c:20] DEBUG: got packet from r1-eth0, 98 bytes, proto: 0x0800
```

r1-eth0: `aa:4f:2d:b2:b3:bc`
r1-eth1: `e2:5b:36:f4:13:47`

# 心得体会
## 更新 checksum
你必须足够理解 ICMP 数据包的 `checksum` 是如何计算的。
`checksum` 的计算机制如下：
- **IP协议**
    
    - **用途**：IPv4头部使用校验和验证头部信息的完整性，确保数据包在路由过程中未被破坏。
        
    - **算法**：
        
        1. 将IP头部分为16位的块（两字节）。
            
        2. 将所有块逐个相加，若溢出则加回低16位。
            
        3. 结果取反，生成校验和。
            
        4. 接收方重复计算校验和，验证结果是否为零。
            
    - **注意**：IPv6不再使用校验和，认为链路层和传输层的校验机制已足够。
        
- **TCP/UDP协议**
    
    - **用途**：TCP和UDP使用校验和验证整个数据段，包括伪头部、头部和数据部分。
        
    - **伪头部**：包含IP地址、协议类型、数据长度等信息，确保传输层校验和考虑网络层信息。
        
    - **算法**：与IP校验和类似，逐块加法+反码。
        
- **ICMP协议**
    
    - **用途**：ICMP（如ping命令）也使用校验和验证其数据报完整性。
        
    - **算法**：和IP校验和一致。
具体来说，实验给出的框架代码是这样计算的：

```c
// calculate the checksum of icmp data, note that the length of icmp data varies
static inline u16 icmp_checksum(struct icmphdr *icmp, int len)
{
	u16 tmp = icmp->checksum;
	icmp->checksum = 0;
	u16 sum = checksum((u16 *)icmp, len, 0);
	icmp->checksum = tmp;
	return sum;

}

// calculate the checksum of the given buf, providing sum
// as the initial value
static inline u16 checksum(u16 *ptr, int nbytes, u32 sum)
{
	if (nbytes % 2) {
		sum += ((u8 *)ptr)[--nbytes];
	}
	while (nbytes > 0) {
		sum += *ptr++;
		nbytes -= 2;
	}
	sum = (sum >> 16) + (sum & 0xffff);
	sum = sum + (sum >> 16);

	return (u16)~sum;
}
```
所以你传入的 `nbytes` 参数应该是你的 `icmp` 报文的长度，具体来说，是不包括前面 ip 头的一些内容。例如在传输 `icmp error` 类型，其会包括错误包的原始 `ip` 头和 8 `bytes` 的数据，你就可以这样计算
```c
int icmp_len = ICMP_HDR_SIZE + IP_BASE_HDR_SIZE + 8;
 
icmp_hdr->checksum=0;
icmp_hdr->checksum=icmp_checksum(icmp_hdr,icmp_len);
```
