

# Optimizing by Greedy

- Coin Change Problem
	- candidate: A finite set of coins, of 1,5,10 and 25 units, with enough number for each value
	- constraints: Pay an exact amount by a selected set of coins
	- optimization: a smallest possible number of coins in the selected smallest
	- 设计货币：如人民币的货币系统的面值有1, 5, 10, 20, 50, 100. 这就是一个最优化问题
- For any amount n:
$$
	min\{i+j+k+l\}
$$
$$
	s.t.\; i+5j+10k+25l=n, 	\text{where $i,j,k,l\in \mathbb{N}$}
$$

For a Greedy Problem, prove the correctness of algorithm is often harder than designing the algorithm.

How to prove?

to prove 
$$
(i^*,j^*,l^*,k^*)==(i,j,k,l);
$$
## Greedy Stratedy
Constructing the final solution by expanding the partial solution step by step, in each of which a selection is made from a set of candidates, with the choice made must be:
- **feasible** 适合性：每时每刻不能与条件矛盾
- **locally optimal** 局部最优导出到全局最优
- **irrevocable** （不回头）已经选择的方案不能在之后被取消选择
	- The choice cannot be revoked in subsequent steps
**KEY**: trading off **feasible** and locally **optimal**
```python
set greedy(set candidate)

    set S=Ø;

    while not solution(S) and   candidate!= Ø

        select locally optimizing x   from candidate;

        candidate=candidate-{x};

        if feasible(x) then S=S union {x};

    if solution(S) then return S

            else return (“no solution”)
```

## Use of Greedy Strategy
### Weighted Graph and MST
MST(Minimum Spanning Tree)
![[Pasted image 20241127143226.png]]

it can be proved that, 
for traditional Graph Traversal strategy such as DFS and BFS, there are cases that graph traversal tree **cannot** be minimum spanning tree, with the vertices explored in **any order**.

### Greedy Algorithms for MST
- Prim' s algorithm
	- Difficult selecting
	- easy circle checking
- Kruskal' s algorithm
	- easy selecting
	- hard circle checking
### Merging Two Vertices
Merging $v_1$ and $v_{2}$ , is delete $v_2$ and give all the neighbors of $v_2$ to $v_{1}$
[[vault/redkoldnote/docs/本科课程/算法设计与分析/Notes/图]]

[[vault/redkoldnote/docs/本科课程/算法设计与分析/Notes/图]]


# Dijkstra 算法
可以阅读这里的笔记 [[vault/redkoldnote/docs/本科课程/算法设计与分析/Notes/图#单源最短路径 (`Dijkstra` 算法)|`Dijkstra`算法]]
# 再论贪心算法
**基本要素**：
- **贪心选择性质**：
	是指所求问题的 **整体最优解** 可以通过一系列 **局部最优**的选择。自顶向下，每一次贪心的决策都可以让问题变为更小的子问题。而 **分而治之**思想的解决问题合并过程，是划分小问题再合并的思想。
