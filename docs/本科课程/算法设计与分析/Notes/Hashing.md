从查找出发
- Brute force
	- $O(n)$
- Balanced BST
	- $O(log n)$
- Hashing - almost constant time
	- $O(1+\alpha)$

# Hashing: the idea
我们有一个很大的 `key space`, 但是只有一小部分在应用中。所以通过构造一个哈希函数，将 `key space` 映射到 `hash table` 中
关键问题：
- Index distribution 下标如何分配
- Collision handling 如果发生碰撞（映射到同一个位置）如何解决
- 存满了能否动态扩张？

## Closed Address
闭地址空间操作：地址不改变，不管你冲突不冲突。

![[closed-address-pic.png]]

### 分析
假设采取简单的 hashing 方式：
- For j=0, 1, 2, ..., m-1, the average length of the list `E[j]` is $n/m$
- The average cost for an ==**unsuccessful**== search
	- 所有不在表里的 key，都同等可能的 hash 到 m 个地址中的任意一个。
	- Total cost = $\Theta\left( 1+\frac{n}{m} \right)$ (1 is scan to null, $\frac{n}{m}$ is the average length)


- The average cost for an ==**successful**== search
	- 需要考虑每个元素可能插入到链表的哪个位置了
		- For each `i`, the probability of that `x_i` is searched is $\frac{1}{n}$
		- For a specific `x_i`, the number of elements examined in a successful search is $t+1$, where $t$ is the number of elements inserted into the same list as $x_{i}$，**after $x_{i}$ has been inserted** 
	-  The average cost of a successful search:
		- Define $a=\frac{n}{m}$ as load factor（负载）
		- cost: ($\frac{1}{m}$ 是插入到一个特定 index 的概率，相当于求 expected (average))
$$
\begin{align}
\frac{1}{n} \sum_{i=1} ^{n}\left\{ 1+\sum_{j=i+1}^{n}{\frac{1}{m}} \right\} & =1+\frac{1}{nm}\sum_{i=1}^{n}(n-i) \\
 & =1+\frac{1}{nm}\sum_{i=1}^{n-1}(i)  \\
 & =1+\frac{{n-1}}{2m}=1+\frac{\alpha}{2}-\frac{\alpha}{2n}=\Theta(1+\alpha)
\end{align}
$$

## Open Address
### 分析
- All elements are stored in the hash table
	- No linked list is used
	- The load factor α cannot be larger than 1
- Collision is settled by “rehashing”
	- A function is used to get a new **hashing address** for each collided address （在哈希表中 rehash）
	- The hash table slots are **probed successively（连续的）**, until a valid location is found
	- 
### Probe（探针）
- Each key is equally likely to have any of the $m!$ Permutations of (`1, 2, ..., m`) as its probe sequence
- Note
	- Both **linear** and **quadratic**(二次方的) probing hve only $m$ distinct probe sequence, as determined by the first probe.

### 耗费
The average number of probes in an **==unsuccessful search==** is at most $1/(1-α) (α=n/m<1)$
- Assuming uniform hashing（平均分布的 hashing）
- Prob. of
	- 1st probe position being occupied is $\frac{n}{m}$
	- 2nd probe position being occupied is $\frac{{n-1}}{m-1}$
	- $j^{th}$ position being occupied is $\frac{{n-j+1}}{m-j+1}$
- So 连续被占用直到第 i 次的概率将为（也就是 unsuccessful search）
$$
\frac{n}{m}\cdot \frac{{n-1}}{m-1}\cdot \frac{{n-2}}{m-2}\cdot \cdots \cdot \frac{{n-i+2}}{m-i+2}\leq \left( \frac{n}{m} \right)^{i-1}=\alpha^{i-1}
$$
Then the average number of probe is:
$$
\sum_{i=1}^{\infty}\alpha^{i-1}=\sum_{i=0}^{\infty}\alpha^{i}=\frac{1}{1-\alpha}
$$
