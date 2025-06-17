# 2020 计网重修班


## 五
![image.png|600](https://kold.oss-cn-shanghai.aliyuncs.com/20250617233848.png)
   **Flags: 有 3bits**
   - reserve bit: 未用
- DF (*D*on't Frag) bit = 0 代表可以做 fragmentation，DF bit = 1 代表不能做 fragmentation。
- MF (*M*ore Frag) bit= 0 代表该数据包是整个数据流里面最后一个包，MF bit = 1 代表还有**更多**被 fragment 的数据包
- Fragment Offset：该片偏移原始数据包开始处的位置。**偏移的字节数是该值乘以8。**
- Total Length：ip 包头和 ip 内容的总长度（**不包括以太头**）
1. 
	1. 转发过程中, `Destination Mac address` 和改变，具体是根据路由器存储更改。
	2. `TTL` 会更改：转发时候，`TTL--`
	3. `Header Checksum` 会更改（因为 IP 改变，校验和自然变）
	4. offset 会根据以太网传输 MTU 变化而变化，因为此 total length 也可能变化
2. 
	1. 每个包最多能装 `1500-28=1472bytes`
	2. `4000/1472=2.7173913`, 故一共要 3 个子包
		1. `subpacket 1, Length=5000,fragment flag：001, offset=0`
		2. `subpacket 2, Length=5000,fragment flag: 001,offset=184`
		3. `subpacket 3, Length=1056,fragment flag: 000,offset-2944`

3. 

