# 加密

## 对称密钥

### 块密码技术-CBC（Cipher Block Chaining）
基本思想：仅随第一个报文发送一个随机值，然后让发送方和接收方使用计算的编码快代替后续的随机数。
将报文切分为几个块。

![[CBC.png]]
具体来说：
1. 加密报文之前，发送方生成一个 $k$ 比特串（随机的），称为初始向量（Initial Vector, **IV**）
2. 对第一个块，发送方计算 $m(1)\oplus c(0)$，即第一块明文和 $IV$ 的异或，然后用块密码算法生成对应的密文块, $c(1)=K_{S}(m(1)\oplus c(0))$
3. 对于第 $i$ 个块，计算 $c(i)\oplus K_{S}(m(i)\oplus c(i-1))$，作为第 $i$ 个密文块

优点：
- 增加的带宽少。（只有第一个 IV）需要发送
- 明文块相同，密文块也几乎不相同
- 显然可以解密。
***注意**：**IV 实际是以明文发送的。***
## 非对称密钥

### RSA Algorithm
- 1977, Rivest, Shamir, Adleman algorithm
(Turing Award 2002)

##### 基础知识
首先介绍一下基础的离散数学知识。

考虑模 n 意义下的加减法，有同余。
-  $\left[ (a\bmod n)+(b\bmod n)\right]\bmod n=(a+b)\bmod n$
- $\left[ (a\bmod n)-(b\bmod n)\right]\bmod n=(a-b)\bmod n$
- $\left[ (a\bmod n)\times(b\bmod n)\right]\bmod n=(a\times b)\bmod n$

推广：
- $(a\bmod n)^{d}\bmod n=a^{d}\bmod n$

###### 欧拉定理
欧拉定理：任意数a的i次方除以N的余数的周期 $\Phi(N)$


##### 应用于网络
- **Message**：可以看作一个比特串（bit pattern）
	- Bit pattern can be uniquely represented by an integer number（表达为一个整数）
- 因此，加密（encrypting）一段报文，等价于加密一个数字

##### RSA Algorithm 细节
- 首先，选择两个 **大质数***，$p$ 和 $q$
	- 大概 500/1024 bits each
- 计算：$N=p\times q$
- 计算：$\Phi=(p-1)\times(q-1)$
	- 这是**欧拉函数**：计算**小于 $N$ 并与 $N$ 互素**的整数个数 (**保密**)
- 选择 $e$ ，一个和 $\Phi$ 互质的数，即 $gcd(e,\Phi)=1$
- 计算 $d$，其为 $e$ 的模反元素 (inverse of $e$ modulo $\Phi$)，i.e. $d\times e \bmod\Phi=1$
- 这样之后，就得到了密钥集合：
	- *Public Key:* $(e,N)$
	- *Private Key*: $(d,N)$


##### 加密和解密
- 欧拉定理
$(M^{e}\bmod N)^{d}\bmod N=M^{ed}\bmod N=M(\bmod N)$
- 加密 (Encryption)
	- Use public-key  $(e,N)$ to encrypt message block $M<N$
	- $C=M^{e}(\bmod N)$
	- Send only $C$
- 解密 (Decryption)
	- Use private-key $(d,N)$ to decrypt cipher $C<N$
	- $M=C^{d}(\bmod N)$

**由于**pq 都很大，所以质因数分解很困难，所以 $\Phi$ 难以被破解, 因而 $e$ 很安全

# Authentication
## 一些认证方式（数字签名方法）
对于最新的 ap5.0 数字签名方法：
- **ap5.0**
	- 非对称加密。
	- ![[Pasted image 20250519103258.png]]
	- 面临 **中间人攻击**
		- *man (or woman) in the middle attack*
		- Trudy poses as Alice (to Bob) , and as Bob (to Alice)
		- ![[middle-attack.png]]
		- Trudy 用了自己的私钥和公钥，而 Bob 无法判断是 Trudy 发送的公钥还是 Alice 发送的。
		- **可以窃听，虽然不能篡改**


## Message Authentication Code （MAC）
- **Receiving msgs from Alice**, Bob wants to ensure:
	- Message **originally came** from *Alice*
	- Message **not changed** since sent by Alice
- Security handling
	- Source impersonation / spoofing （伪造源）
	- Message injection / modification （修改报文）s
	- Message re-sequencing / replaying （重放攻击）
### Authentication Functions
- Creating an **authenticator** which may involve functions of
	- Sender / Message Text 
	- Time Stamp / Sequence Number / Random Value 
	- Secret Keys
- 发送者计算并发送 `authenticator` 作为报文的一部分
- 接受者比较接收到的 `authenticator` 和 `expected authenticator`
![[message-authentication-code.png]]
###  Authentication Methods
有两种思路。
- **加密**的思路 Authentication by **Crypto**
	- CBC-MAC
- **哈希**的思路 Authentication by **Hash**
	- 使用哈希函数来做
	- MD5, 128 bit MAC, (RFC 1321)
	- SHA-1, 160 bit MAC, (NIST, FIPS PUB 180-1)
	- **需要思考这个哈希算法怎样会产生碰撞**：**碰撞意味着篡改报文的可能性**，如果碰撞概率很低是可以接受的。
## Key Distribution
- Problem:
	- How can Alice and Bob *share the common secret key*
	- How does Alice know Bob's public key does be *Bob's public key*
- **Solution**
	- **Diffie-Hellman Key Exchange**
	- Trusted certification authority (**CA**)
	- Certificate for public key

	之前提到的  **Middle Attack**，**Play Back**攻击，本质都是密钥分发过程存在很多漏洞。

