我们点进详情页直接访问，查找股票代码，找到了可能的api  
基础查找url为  
```  
https://push2.eastmoney.com/api/qt/stock/get?invt=2&fltt=1&cb=jQuery351004935203543461253_1747732615154&fields=f58%2Cf734%2Cf107%2Cf57%2Cf43%2Cf59%2Cf169%2Cf301%2Cf60%2Cf170%2Cf152%2Cf177%2Cf111%2Cf46%2Cf44%2Cf45%2Cf47%2Cf260%2Cf48%2Cf261%2Cf279%2Cf277%2Cf278%2Cf288%2Cf19%2Cf17%2Cf531%2Cf15%2Cf13%2Cf11%2Cf20%2Cf18%2Cf16%2Cf14%2Cf12%2Cf39%2Cf37%2Cf35%2Cf33%2Cf31%2Cf40%2Cf38%2Cf36%2Cf34%2Cf32%2Cf211%2Cf212%2Cf213%2Cf214%2Cf215%2Cf210%2Cf209%2Cf208%2Cf207%2Cf206%2Cf161%2Cf49%2Cf171%2Cf50%2Cf86%2Cf84%2Cf85%2Cf168%2Cf108%2Cf116%2Cf167%2Cf164%2Cf162%2Cf163%2Cf92%2Cf71%2Cf117%2Cf292%2Cf51%2Cf52%2Cf191%2Cf192%2Cf262%2Cf294%2Cf295%2Cf269%2Cf270%2Cf256%2Cf257%2Cf285%2Cf286%2Cf748%2Cf747&secid=0.000001&ut=fa5fd1943c7b386f172d6893dbfba10b&wbp2u=%7C0%7C0%7C0%7Cweb&dect=1&_=1747732615155  
```  
可以猜出id为`&secid=0.000001`字段设置，  
- 0代表沪市  
- 1代表深市  
  
| 股票代码 | 最新价格 | 涨跌幅度 |  
|------|------|------|  
| f57  | f43  | f170 |  
  
  
  
```python  
import requests  
import json  
import re  
import pandas as pd  
from time import sleep  
import datetime  
import matplotlib.pyplot as plt  
  
# 获取单个股票数据  
def get_stock_data(stock_id, market_code):  
    url = f"https://push2.eastmoney.com/api/qt/stock/get?invt=2&fltt=1&cb=jQuery351004935203543461253_1747732615154&fields=f58%2Cf734%2Cf107%2Cf57%2Cf43%2Cf59%2Cf169%2Cf301%2Cf60%2Cf170%2Cf152%2Cf177%2Cf111%2Cf46%2Cf44%2Cf45%2Cf47%2Cf260%2Cf48%2Cf261%2Cf279%2Cf277%2Cf278%2Cf288%2Cf19%2Cf17%2Cf531%2Cf15%2Cf13%2Cf11%2Cf20%2Cf18%2Cf16%2Cf14%2Cf12%2Cf39%2Cf37%2Cf35%2Cf33%2Cf31%2Cf40%2Cf38%2Cf36%2Cf34%2Cf32%2Cf211%2Cf212%2Cf213%2Cf214%2Cf215%2Cf210%2Cf209%2Cf208%2Cf207%2Cf206%2Cf161%2Cf49%2Cf171%2Cf50%2Cf86%2Cf84%2Cf85%2Cf168%2Cf108%2Cf116%2Cf167%2Cf164%2Cf162%2Cf163%2Cf92%2Cf71%2Cf117%2Cf292%2Cf51%2Cf52%2Cf191%2Cf192%2Cf262%2Cf294%2Cf295%2Cf269%2Cf270%2Cf256%2Cf257%2Cf285%2Cf286%2Cf748%2Cf747&secid=0.{stock_id}&ut=fa5fd1943c7b386f172d6893dbfba10b&wbp2u=%7C0%7C0%7C0%7Cweb&dect=1&_=1747732615155"    try:        res = requests.get(url)        res.raise_for_status()        res_text = re.search(r'\{.+\}', res.text).group(0)        res_dict = json.loads(res_text)        stock_code = res_dict['data']['f57']  # 股票代码  
        change_rate = res_dict['data']['f170']  # 涨跌幅  
        latest_price = res_dict['data']['f43']  # 最新价格  
        print({"股票代码": stock_code, "涨跌率": change_rate, "最新价格": latest_price})  
        return {"股票代码": stock_code, "涨跌率": change_rate, "最新价格": latest_price}  
    except Exception as e:        print(f"Error fetching data for {stock_id}: {e}")        return None  
# 获取一组股票数据  
def fetch_stocks(stock_list):  
    data = []    for stock in stock_list:        market_code, stock_id = stock.split(".")        result = get_stock_data(stock_id, market_code)        if result:            result["时间"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")  
            data.append(result)        sleep(0.5)  # 控制请求频率  
    return data  
# 爬取并保存数据  
def crawl_stocks_periodically(stocks, output_file, duration_minutes=15, interval_seconds=60):  
    end_time = datetime.datetime.now() + datetime.timedelta(minutes=duration_minutes)    all_data = []    while datetime.datetime.now() < end_time:        print(f"Fetching data at {datetime.datetime.now()}")        data = fetch_stocks(stocks)        all_data.extend(data)        sleep(interval_seconds - 0.5 * len(stocks))  # 间隔时间  
    df = pd.DataFrame(all_data)    df.to_csv(output_file, index=False, encoding="utf-8")    print(f"Data saved to {output_file}")  
# 读取数据并绘图  
from matplotlib import rcParams  
def analyze_and_plot(file):  
    # 设置字体  
    rcParams['font.sans-serif'] = ['PingFang SC']  # 使用黑体  
    rcParams['axes.unicode_minus'] = False   # 解决负号显示问题  
    df = pd.read_csv(file)    df["时间"] = pd.to_datetime(df["时间"])  
  
    # 涨跌率折线图  
    plt.figure(figsize=(10, 6))    for stock_code in df["股票代码"].unique():  
        stock_data = df[df["股票代码"] == stock_code]  
        plt.plot(stock_data["时间"], stock_data["涨跌率"], label=stock_code)  
    plt.title("stock price analysis pic")    plt.xlabel("time")    plt.ylabel("Rate of increase or decrease")    plt.legend()    plt.grid()    plt.savefig("涨跌率变化.png")  
    plt.show()  
    # 价格变化折线图  
    for stock_code in df["股票代码"].unique():  
        plt.figure(figsize=(10, 6))        stock_data = df[df["股票代码"] == stock_code]  
        plt.plot(stock_data["时间"], stock_data["最新价格"], label=f"{stock_code}price change")  
        plt.title(f"{stock_code}price change")        plt.xlabel("time")        plt.ylabel("price/0.01Yuan")        plt.legend()        plt.grid()        plt.savefig(f"{stock_code}_价格变化.png")  
        plt.show()  
# 主函数  
def main():  
    # 股票列表  
    stocks = ["0.000001", "0.000002", "0.000063", "0.000501", "0.000930"]  # 示例股票  
    output_file = "./out/stock_data.csv"  
    if 'out/stock_data.csv':        print("直接绘图")  
        analyze_and_plot(output_file)  
    # 判断是否在 A 股交易时间段内  
    now = datetime.datetime.now()    if (now.weekday() < 5 and        ((now.hour == 9 and now.minute >= 30) or (10 <= now.hour < 11) or         (13 <= now.hour < 15))):        print("开始爬取数据...")  
        crawl_stocks_periodically(stocks, output_file, duration_minutes=15, interval_seconds=60)        print("开始绘图...")  
        analyze_and_plot(output_file)    else:        print("当前非交易时间，程序结束。")  
  
if __name__ == "__main__":  
    main()  
```  
  

直接绘图    
    