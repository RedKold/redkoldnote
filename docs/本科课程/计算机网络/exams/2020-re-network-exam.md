# 2020 计网重修班


## 五
![image.png|600](https://kold.oss-cn-shanghai.aliyuncs.com/20250617233848.png)
>    Flags: 有 3bits
>    DF bit = 0 代表可以做 fragmentation，DF bit = 1 代表不能做 fragmentation。
	MF bit= 0 代表该数据包是整个数据流里面最后一个包，MF bit = 1 代表还有更多被 fragment 的数据包
1. 
	1. 转发过程中, `Destination Mac address` 和改变，具体是根据路由器存储更改。
	2. `TTL` 会更改：转发时候，`TTL--`
	3. `Header Checksum` 会更改（因为 IP 改变，校验和自然变）
	4. offset 会根据以太网传输 MTU 变化而变化，因为此 total length 也可能变化
2. 
	1. 每个包最多能装 `1500-28=1472bytes`
	2. `4000/1472=2.7173913`, 故一共要 3 个子包
		1. `subpacket 1, Length=1472,fragment flag`
3. 

