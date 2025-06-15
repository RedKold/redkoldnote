# mOSPF 报文
分为 Hello 报文和 LSU 报文
- **Hello报文**用于检测自己周围的链路信息，维护邻居表。
- **LSU报文**用于与网络中的其他所有节点同步各自检测到的链路信息，维护**LSDB**。**LSDB**可以看做每个节点上存储的所有链路的状态集合。

不同的 header 构造都有库函数可以使用
不同的报文头大小，都有定义的宏

### 通用报文头(Header)

![](https://netdocs.lab427.top/images/lab7/header.png)

- version：为mOSPF的版本号
- type：用于标识该报文是Hello类型还是LSU类型
- length：mOSPF头部以及负载的总长度
- Router ID：标识产生该mOSPF报文的节点
- Aera ID：区域ID，本次实验中无用
- checksum：检测报文是否损坏
- padding：填充，为0
**在 `mospf_proto.h`**中，有详细介绍
![[mospf-hdr-data-struct.png]]

### Hello报文

Hello报文用于维持邻居之间的关系，那么该报文中需要提供以下必要的信息：
- 发送方Router ID，
- 发送接口的IP地址，
- 接收接口的IP地址，
- 子网网段。
其中，Router ID可以从mOSPF Header中获取，IP地址可以直接从IP Header中获取，子网网段则通过mask与IP地址计算得到。
#### hello 内容
其数据结构封装为
```c
struct mospf_hello {

u32 mask; // network mask associated with this interface

u16 helloint; // number of seconds between hellos from this router


u16 padding; // set to zero

}__attribute__ ((packed));

#define MOSPF_HELLO_SIZE sizeof(struct mospf_hello)
```


![](https://netdocs.lab427.top/images/lab7/hello.png)

- mask：表示发送端口和接收端口之间的子网掩码
- interval：表示两个节点之间**约定的Hello报文发送间隔**，用于确定超时时间。在本实验中，所有路由器都以相同的间隔发送Hello报文，因此该字段意义不大。
- 即都设置 
   ` hello->helloint = MOSPF_DEFAULT_HELLOINT;`
#### 发送
- 周期性地在所有端口**多播**Hello报文，以维护邻居关系。**这里存在一个多播地址**的问题
	- `#define MOSPF_ALLSPFRouters 0xe0000005 // 224.0.0.5` ，这个宏可以使用。主机序存储。

#### **OSPF 的 Hello 机制**

OSPF 的 Hello 机制用于建立和维护邻居关系，确保邻居之间的连通性。它通过周期性地发送和接收 Hello 报文实现。

#### **Hello 报文的作用**

1. **建立邻居关系**：当路由器收到邻居的 Hello 报文时，会判断是否可以建立邻居关系。
    
2. **维护邻居关系**：通过周期性发送 Hello 报文来维持邻居关系。
    
3. **检测邻居状态**：如果在指定时间内未收到邻居的 Hello 报文，OSPF 会认为邻居不可达。
    

---

##### **确认邻居是否死亡**

OSPF 使用 **Dead Interval** 来判断邻居是否死亡：

1. **Dead Interval** 是一个计时器，表示如果在该时间内未收到邻居的 Hello 报文，则认为邻居已死亡。
    
2. **每次收到 Hello 报文时，路由器会重置该计时器。**
    
3. 如果 Dead Interval 超时，路由器会：
    
    - 将邻居标记为不可用。
        
    - 更新 LSDB，生成新的 LSA 并触发网络重新计算。
        

---

##### **收到 Hello 后更新 Alive 时间**

1. **解析 Hello 报文**：
    
    - 检查报文是否来自已知的邻居。
        
    - 检查 Hello 报文的网络参数（例如 Area ID、Hello Interval、Dead Interval）是否匹配。
        
    - 检查报文中是否包含本地路由器的 Router ID（表示邻居认为本地是它的邻居）。
        
2. **重置 Dead Interval 计时器**：
    
    - 如果邻居有效（通过上述检查），重置对应邻居的 Dead Interval 计时器。
        
    - Dead Interval 通常是 Hello Interval 的 4 倍，例如，默认情况下 Hello Interval 是 10 秒，Dead Interval 是 40 秒。
        
3. **更新邻居状态**：
    
    - 如果邻居刚刚从不可达变为可达，更新邻居状态为 `FULL` 或 `2-WAY`，根据 OSPF 邻居状态机的规则。
        
    - 记录邻居的最新活动时间。
        
4. **触发链路状态更新（如有必要）**：
    
    - 如果邻居状态有变化，可能需要更新链路状态数据库并触发 SPF 计算。
        

---

##### **Hello Interval 和 Dead Interval**

- **Hello Interval**：发送 Hello 报文的时间间隔，通常为 10 秒（可以配置）。
    
- **Dead Interval**：检测邻居死亡的时间间隔，通常为 Hello Interval 的 4 倍。
    

这种设计在保持网络拓扑一致性和减少开销之间取得了平衡。

### LSU报文

**LSU除了上述字段外，还会附带一系列的LSAs**

![](https://netdocs.lab427.top/images/lab7/lsu.png)

- seq：**同一节点**发送的LSU的该字段随时间严格递增，表示LSU的新旧
- ttl：控制LSU的生命周期，**LSU每被转发一次，该字段都要自减**
- nadv：表示该LSU中附带的LSAs的数量


#### LSU转发机制
1. **接收 LSU 报文**：当路由器接收到一个 LSU 报文时，会检查报文的有效性和来源，确保它符合 OSPF 协议的要求。
    
2. **更新 LSDB**：
    
    - 路由器会从 LSU 报文中提取 LSA（Link State Advertisement，链路状态广告）信息。
        
    - 比较 LSA 的序列号。如果收到的 LSA 比本地已有的 LSA 更新（序列号更大），则更新本地 LSDB 并标记为已更新。
        
    - 如果 LSA 过期或已过时（序列号更小），则丢弃 LSA，不进行进一步处理。
        
3. **转发 LSU 报文**：
    
    - 如果 LSA 是新的（即 LSDB 更新成功），路由器会将该 LSA 转发给其所有 OSPF 邻居。
        
    - 转发时，会跳过发送该 LSA 的邻居，以避免原路返回形成循环。
        
4. **确认机制**：
    
    - 每个 LSU 报文都需要确认。接收方通过发送 LSACK（Link State Acknowledgment）报文来确认已接收到并处理了 LSA。
        
    - 如果未收到 LSACK，发送方会重传 LSU，但重传次数受到 OSPF 的重试限制。
        
5. **洪泛传播（Flooding）**：
    
    - LSU 的传播采用洪泛机制（Flooding）。
        
    - 通过逐跳转发，LSU 报文在网络中传播，确保每个路由器最终都能收到并更新相应的链路状态信息。
        
6. **收敛**：
    
    - 当所有路由器的 LSDB 达到一致状态时，OSPF 网络收敛完成。
        

这种转发机制结合了序列号验证、邻居跳过和确认机制，确保 OSPF 网络的拓扑更新高效且可靠，避免环路和冗余传输。
### LSA

**LSA是附带在LSU中的信息。每一个LSA描述节点与它的一个邻居的链路信息。**

![](https://netdocs.lab427.top/images/lab7/lsa.png)

- network：邻居之间的子网网段
- mask：邻居之间的子网掩码
- Router ID则是邻居节点的编号

在本实验中，LSA实际上是跟在LSU之后的一个数组。
# Router 实例
Router 实例实际上就是每个节点运行程序的实例，其是一个路由程序。
结构如下
```c
typedef struct {

struct list_head iface_list; // the list of interfaces

int nifs; // number of interfaces

struct pollfd *fds; // structure used to poll packets among

// all the interfaces
 

#ifdef DYNAMIC_ROUTING

// used for mospf routing

u32 area_id;

u32 router_id;

u16 sequence_num;

int lsuint;

#endif

} ustack_t;

  

extern ustack_t *instance;
```
**有不同的接口**，存在 `iface_list` 中。
其中 `sequence_num` 是标识其版本信息，及其最新的 LSU 状态信息是什么样的，来保证系统的状态是最新的。

在 OSPF（Open Shortest Path First）协议中，序列号（Sequence Number）是用来标识链路状态公告**LSA，Link State Advertisement** 的版本号，它的主要作用是区分最新的 LSA 和旧的 LSA，确保网络中的路由器可以使用最新的链路状态信息来构建拓扑。

`area_id` 表示区域id，在本实验中没有意义；
`router_id` 表示该路由器的唯一标识；
`sequence_num` 表示LSU的序列号，用于表示LSU报文的新旧；`lsuint` 表示发送LSU的时间间隔（s）。
	序列号的更新在这个函数
```c
void mospf_init_lsu(struct mospf_lsu *lsu, u32 nadv)
{
	lsu->seq = htons(instance->sequence_num);
	lsu->unused = 0;
	lsu->ttl = MOSPF_MAX_LSU_TTL;
	lsu->nadv = htonl(nadv);
}
```

# LSDB 数据库的维护
## 映射
我们维护了一个路由器 ID 到整数的映射，用 `rid_ind_map`
一个 `rid_int_map` 的结构长这样：
```c
struct rid_int{
	struct list_head list;
	u32 rid;
	int int_id;
};
```
具体逻辑是：
- **一个路由器的 router id** `u32 rid`，我们在 init 函数中，按顺序赋予每个路由器一个 int 的 ID（方便访问数组，来获得各种信息）
- 在赋予每个路由器 int ID 后，我们使用函数，将其根据 rid 哈希到数组
```c
	u8 key = hash8((char *)&rid, 4);
	// 将节点添加到对应的链表头
	struct list_head *list = &rid_int_map[key];
	list_add_head(&node->list, list);

}
```
其中 `rid_int_map` 是一个从 rip 到 int_id 的映射。
在我们建立的图中，我们事实上用 ind_id 来标识节点
![[exp7-图.png]]


> [!Note]
> 你一定要有一个多线程的想法。每个点（路由器）都是一个线程，他们各自做路由管理。在每个他们自己执行的 `convert_path_to_rtable` 中，他们都是各自的第一号节点（索引 0）


# Dijkstra
**你可以将链路的代价视为相同**，也就是 `graph` 又是 01 矩阵，又是邻接矩阵，又是代价矩阵。

# 打印 OSPF 数据库
`// router_id subnet mask neighbor_rid`
`// router_id subnet mask neighbor_rid`
10.0.4.4        10.0.6.0        255.255.255.0   0.0.0.0


```
MOSPF Database entries:
10.0.2.2        10.0.2.0        255.255.255.0   10.0.1.1
10.0.2.2        10.0.4.0        255.255.255.0   10.0.4.4
10.0.3.3        10.0.3.0        255.255.255.0   10.0.1.1
10.0.3.3        10.0.5.0        255.255.255.0   10.0.4.4
10.0.4.4        10.0.4.0        255.255.255.0   10.0.2.2
10.0.4.4        10.0.5.0        255.255.255.0   10.0.3.3
10.0.4.4        10.0.6.0        255.255.255.0   0.0.0.0
```

```c
#我的答案
DEBUG: source router ID: 10.0.1.1, index: 0


prev array:
10.0.1.1 -> -
10.0.3.3 -> 10.0.1.1
0.0.0.0 -> -
10.0.4.4 -> 10.0.3.3
10.0.2.2 -> 10.0.1.1
0.0.0.0 -> -
0.0.0.0 -> -
0.0.0.0 -> -
0.0.0.0 -> -
DEBUG: Processing router 1 with ID 10.0.2.2
DEBUG: Processing router 3 with ID 10.0.3.3
DEBUG: Processing router 3 with ID 10.0.3.3
DEBUG: Processing router -1 with ID 0.0.0.0
ERROR: No valid path to router -1
DEBUG: Processing router -1 with ID 0.0.0.0
ERROR: No valid path to router -1
DEBUG: Processing router -1 with ID 0.0.0.0
ERROR: No valid path to router -1
DEBUG: Processing router -1 with ID 0.0.0.0
ERROR: No valid path to router -1
calculated routing table entries:
a000100 ffffff00        0       r1-eth0
a000200 ffffff00        0       r1-eth1
a000300 ffffff00        0       r1-eth2
a000400 ffffff00        a000202 r1-eth1
a000500 ffffff00        a000303 r1-eth2
DEBUG: loaded new routing table.
```

```c
#真正的路由表reference
prev array:
10.0.1.1 -> -1
10.0.2.2 -> 10.0.1.1
10.0.4.4 -> 10.0.3.3
10.0.3.3 -> 10.0.1.1
calculated routing table entries:
a000100 ffffff00        0       r1-eth0.
a000200 ffffff00        0       r1-eth1.
a000300 ffffff00        0       r1-eth2.
a000500 ffffff00        a000303 r1-eth2.
a000400 ffffff00        a000202 r1-eth1.
a000600 ffffff00        a000303 r1-eth2.
DEBUG: [r1-eth2:10.0.3.1] received mospf lsu, from router [a000303]
DEBUG: received new mospf lsu packet, with 2 lsa from 10.0.3.3.
MOSPF Database entries:
10.0.2.2        10.0.2.0        255.255.255.0   10.0.1.1
10.0.2.2        10.0.4.0        255.255.255.0   10.0.4.4
10.0.3.3        10.0.3.0        255.255.255.0   10.0.1.1
10.0.3.3        10.0.5.0        255.255.255.0   10.0.4.4
10.0.4.4        10.0.4.0        255.255.255.0   10.0.2.2
10.0.4.4        10.0.5.0        255.255.255.0   10.0.3.3
10.0.4.4        10.0.6.0        255.255.255.0   0.0.0.0
DEBUG: forward mospf lsu packet, send from a000201 to a000202
```
![[Pasted image 20250606235735.png]]

- 会不会是 `prev[]` 的问题

- 不是
- 应该是没有配置有效出接口的问题。
	- 已经解决
```  
[r2]
DEBUG: New MOSPF neighbor detected: rid=167773188, ip=4.4.0.10, mask=4.4.0.10

DEBUG: Generating mOSPF LSU message
```
r2 发现了 10.0.4.4 这个邻居，后来又 delete 了一个邻居，会不会是这里的问题呢？

会不会是 HASH 碰撞的问题？

观察得到，
![[Pasted image 20250607133108.png|500]]
- 原来 `Processing router 7`，即 10.0.4.4 是可以正常得到的，其 prev 如图
```
prev array:
10.0.1.1 -> -1
10.0.2.2 -> 10.0.1.1
0.0.0.0 -> -1
0.0.0.0 -> -1
10.0.3.3 -> 10.0.1.1
0.0.0.0 -> -1
0.0.0.0 -> -1
10.0.4.4 -> 10.0.2.2
0.0.0.0 -> -1
0.0.0.0 -> -1
0.0.0.0 -> -1
```

这时候能返回正常的路由表

但是后来变成了
```
prev array:

10.0.1.1 -> -1
10.0.2.2 -> 10.0.1.1
0.0.0.0 -> -1
10.0.4.4 -> 10.0.2.2
10.0.3.3 -> 10.0.1.1
0.0.0.0 -> -1
0.0.0.0 -> -1
10.0.4.4 -> -1
0.0.0.0 -> -1
0.0.0.0 -> -1
0.0.0.0 -> -1
```
就少了一项。

- 但是观察得到我们的 MOSPF DATABASE 数据是一样的，是稳定的，但是为什么映射关系会变化，dijkstra 会变化呢？猜测是 rid_int 映射关系没有维护好，上次做完没有清空。这次尝试在 init_graph 的时候清空一下试试？

	- 清空了也没用
- 现在看起来 prev 是对的，可能是 node_sorted 没有标记好
![[Pasted image 20250607140425.png]] d
定位到就是 dijkstra 的问题已经解决了

# Unlink
断开 r1 和 r2 的链接，
`(r2) INFO: neighbor: [ 10.0.2.1 ]timeout, remove it.`
发现 r2 可以发现超时现象

发现 r1 的邻居没有正常更新，一个邻居都没有，这不太正常。所以后面更新路由了他也不知道



## 抓包
```bash
tcpdump -i r1-eth0 -s0 -U -w dump-r1-eth0.pcap & ./mospfd
```


//参考

```bash
// 断开之前
DEBUG: received new mospf lsu packet, with 2 lsa from 10.0.3.3.
MOSPF Database entries:
10.0.2.2        10.0.2.0        255.255.255.0   10.0.1.1
10.0.2.2        10.0.4.0        255.255.255.0   10.0.4.4
10.0.3.3        10.0.3.0        255.255.255.0   10.0.1.1
10.0.3.3        10.0.5.0        255.255.255.0   10.0.4.4
10.0.4.4        10.0.4.0        255.255.255.0   10.0.2.2
10.0.4.4        10.0.5.0        255.255.255.0   10.0.3.3
10.0.4.4        10.0.6.0        255.255.255.0   0.0.0.0

// 这是更新了之后的
DEBUG: received new mospf lsu packet, with 2 lsa from 10.0.2.2.
MOSPF Database entries:
10.0.2.2        10.0.2.0        255.255.255.0   0.0.0.0
10.0.2.2        10.0.4.0        255.255.255.0   10.0.4.4
10.0.3.3        10.0.3.0        255.255.255.0   10.0.1.1
10.0.3.3        10.0.5.0        255.255.255.0   10.0.4.4
10.0.4.4        10.0.4.0        255.255.255.0   10.0.2.2
10.0.4.4        10.0.5.0        255.255.255.0   10.0.3.3
10.0.4.4        10.0.6.0        255.255.255.0   0.0.0.0

```