# Potgen

古代ギリシアの壺（アンフォラ）の形態学的パラメータ（morphological parameters）を探究する。

## 装飾
形と独立して、装飾を調整できる関数パラーメタも形と対称になるようにつくりたい。
柄（装飾）は形状以上に面白い部分で、実は古代ギリシア陶器の文様はかなり「文法的」だ。


### 方法1: 文様ライブラリ

最も簡単。ギリシア陶器によく出る文様を部品化する。

```text
meander      （雷文）
wave         （波）
palmette     （パルメット）
lotus        （ロータス）
triangle
chevron
spiral
rosette
```

そして

```text
肩
 ↓
meander

胴
 ↓
warrior_scene

脚
 ↓
wave
```

のように配置する。

### 方法2: パターン生成

文様そのものをアルゴリズムで作る。例えば有名な雷文（Greek Key Pattern）。

```text
┌─┐
│ └─┐
└───┘
```

は本質的には

```text
直線
90度回転
繰り返し
```

だけ。SVGなら

```svg
<path d="..." />
```

をループ生成できる。

```js
for (let i=0; i<20; i++) {
   drawMeanderSegment(...)
}
```




### 方法3: L-System

植物生成で有名な方法。例えば

```text
A -> AB
B -> A
```

みたいな書換規則。これを文様に応用すると、

```text
spiral
vine
leaf
```

のような有機的装飾を生成できる。古代ギリシアの植物文様との相性が良い。


