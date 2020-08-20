/*
 * @Description: 牌型库
 * @Author: xigal
 * @Date: 2019-02-25 09:54:13
 * @LastEditTime: 2019-06-10 17:15:21
 */

export namespace cardlib {
    const _POINTS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const _COLORS = ['', 'Spade', 'Heart', 'Club', 'Diamond']
    const _COLORNAMES = ['', '黑桃', '红心', '梅花', '方块']
    const _XPOINT = ['Xa', 'Xb', 'Xc']
    const _XNAMES = ['小王', '大王', 'X']
    const _CARDTYPE_PASS = 'pass'
    const _PPV: { [index: string]: number } = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'XA': 14, 'XB': 15, 'XC': 16, '小王': 14, '大王': 15, 'X': 16 }
    const _PCV: { [index: string]: number } = { 'S': 1, 'H': 2, 'C': 3, 'D': 4, '黑桃': 1, '红心': 2, '梅花': 3, '方块': 4 }
    enum _MATCHTYPE { EQ, LE, GE }
    enum _KEYGETTYPE { MINCARD, MAXCARD }

    export enum FILTER_FLAGS {
        // 匹配状态
        MATCH_STATUS = 0x0001,
        // 查找所有
        FIND_ALL = 0x0002
    }
    export enum PP { cpNull, cpA, cp2, cp3, cp4, cp5, cp6, cp7, cp8, cp9, cp10, cpJ, cpQ, cpK, cpXa, cpXb, cpXc, cpMinX = cpXa, cpMin = cpA, cpMax = cpXc }
    export enum PC { ccNull, ccSpade, ccHeart, ccClub, ccDiamond, ccMin = ccSpade, ccMax = ccDiamond }

    export interface OptionCardStyle {
        readonly each: number;
        readonly length: number;
        readonly matchtype?: string;
        readonly serial?: boolean;
        readonly point?: string;
        readonly color?: string;
        readonly samecolor?: boolean;
        readonly serial_begin?: string;
        readonly serial_end?: string;
        readonly comparelength?: boolean;
        /**获取key的方式，可选，使用最小值或者最大值，默认最小值(min,max) */
        readonly howgetkey?: string;
    }

    export interface OptionCardType {
        readonly id?: number;
        readonly name: string;
        readonly code: string;
        readonly value: number;
        readonly enabled?: boolean;
        readonly styles?: OptionCardStyle[];
        readonly onelength?: boolean;
    }

    export interface OptionCardRule {
        readonly types: OptionCardType[];
        readonly values?: { point: number[], color: any }
        readonly serials?: number[] | string;
        readonly baida?: { cards: string, cantbe?: string };
    }

    export interface CardPoint {
        all: number;
        one: { [color: number]: number };
    }

    export interface CardStyle {
        readonly each: number;
        readonly length: number;
        readonly matchtype: _MATCHTYPE;
        readonly serial: boolean;
        readonly point: number;
        readonly color: { [color: number]: number };
        readonly samecolor: boolean;
        readonly serial_begin: number;
        readonly serial_end: number;
        readonly ismain: boolean;
        readonly comparelength: boolean;
        /**是否使用最小值为key */
        readonly key_is_the_min: boolean;
    }

    export interface CardType {
        readonly id: number;
        readonly name: string;
        readonly code: string;
        readonly value: number;
        enabled: boolean;
        readonly each: number;
        readonly mincount: number;
        readonly maxcount: number;
        readonly styles: CardStyle[];
        readonly onelength: boolean;
        readonly keystyle: CardStyle;
    }

    export interface ParseResult {
        src: CardPile,
        pile: CardPile,
        out: CardPile,
        type: CardType,
        filled: CardPile,
        key?: Card,
    }

    export class Card {
        private __point: number = 0
        private __color: number = 0
        private __status: number = 0
        /**
         * 几种模式设置 set(point,color) or set(cardvalue) or set(cardcode) or set(card)
         * @param src cardvalue|cardcode|card|object
         * @param c   color
         */
        constructor(src?: number | string | Card | any, c?: number) {
            if (src != undefined) this.set(src, c);
        }

        set point(v: number) { this.__point = v; }
        get point(): number { return this.__point; }
        set color(v: number) { this.__color = v; }
        get color(): number { return this.__color; }
        set status(v: number) { this.__status = v; }
        get status(): number { return this.__status; }

        get name(): string { return !this.valid ? '牌背' : (this.__point >= PP.cpMinX ? _XNAMES[this.__point - PP.cpMinX] : _COLORNAMES[this.__color] + _POINTS[this.__point]); }
        get code(): string { return !this.valid ? '' : (this.__point >= PP.cpMinX ? _XPOINT[this.__point - PP.cpMinX] : _COLORS[this.__color].substr(0, 1).toLowerCase() + _POINTS[this.__point]).toLowerCase() }
        get valid(): boolean { return this.point_valid && this.color_valid; }
        get point_valid(): boolean { return PP.cpMin <= this.__point && this.__point <= PP.cpMax; }
        get color_valid(): boolean { return PC.ccMin <= this.__color && this.__color <= PC.ccMax; }
        get value(): number { return !this.valid ? 0 : this.__color * PP.cpMax + this.__point; }

        /**
         * 几种模式设置 set(point,color) or set(cardvalue) or set(cardcode) or set(card)
         * @param src cardvalue|cardcode|card|object
         * @param c   color
         */
        set(src: number | string | Card | any, c?: number): Card {
            let t = typeof (src);
            if (t === 'number') {
                if (c === undefined) {
                    if (src <= 0) {
                        this.__color = this.__point = 0;
                    } else if (src <= PP.cpMax) {
                        this.__color = PC.ccMin;
                        this.__point = src;
                    } else {
                        this.__color = Math.floor(src / PP.cpMax);
                        this.__point = src % PP.cpMax;
                    }
                } else {
                    this.__point = src;
                    this.__color = c || PC.ccNull;
                }
            } else if (t === 'string') {
                src = src.toUpperCase().trim();
                if (_PPV.hasOwnProperty(src)) {
                    this.__point = _PPV[src]
                    this.__color = PC.ccMin;
                } else {
                    let ci = src.substring(0, 1)
                    let pi = src.substring(1)
                    let c = _PCV[ci]
                    let v = _PPV[pi]
                    if (c && v) {// 全值设置
                        this.__point = v;
                        this.__color = c;
                    } else if (c) {// 只是花色
                        this.__point = PP.cpNull;
                        this.__color = c;
                    } else if (src.length > 2) {
                        this.__color = _PCV[src.substring(0, 2)] || PC.ccNull;
                        this.__point = _PPV[src.substring(src.length - 1)] || PP.cpNull;
                    } else if (v = _PPV[ci]) {
                        this.__point = v;
                        this.__color = PC.ccNull;
                    } else {
                        this.__point = PP.cpNull;
                        this.__color = PC.ccNull;
                    }
                }
            } else if (t === 'object') {
                this.__point = src.point || PP.cpNull;
                this.__color = src.color || PC.ccNull;
            }
            return this;
        }

        clear(): void { this.__color = this.__point = this.__color = 0; }
        /**
         * 展开cards为card数组
         * @param cards 
         * @param checkvalid 是否检查有效性，无效的牌不加入到列表里
         * @param ret 
         */
        static expand(cards: any, checkvalid: boolean = true, ret?: Array<Card>): Array<Card> {
            let t = typeof (cards)
            ret = ret || new Array<Card>();
            if (cards instanceof CardPile) {
                for (let i in cards.list) {
                    let c = new Card(cards.list[i])
                    if ((c.valid || !checkvalid)) ret.push(c)
                }
            } else if (cards instanceof Card) {
                if ((cards.valid || !checkvalid)) ret.push(cards)
            } else if (t === 'string') {
                let cs = cards.split(',')
                for (let i in cs) {
                    let c = new Card(cs[i])
                    if ((c.valid || !checkvalid)) ret.push(c)
                }
            } else if (Array.isArray(cards)) {
                for (let i in cards) {
                    Card.expand(cards[i], checkvalid, ret);
                }
            } else {
                let c = new Card(cards)
                if ((c.valid || !checkvalid)) ret.push(c)
            }
            return ret;
        }
    }

    export class CardSet {
        private __points: { [point: number]: CardPoint }
        private __count: number;
        constructor(pile?: CardPile | CardSet) {
            this.__points = {}
            this.__count = 0;
            for (let i = PP.cpMin; i <= PP.cpMax; i++) {
                let colors: any = {}
                for (let ii = PC.ccMin; ii <= PC.ccMax; ii++) colors[ii] = 0;
                this.__points[i] = { all: 0, one: colors };
            }
            if (pile) this.set(pile);
        }

        get count(): number { return this.__count; }
        get pile(): CardPile {
            let pp = new CardPile()
            for (let i = PP.cpMin; i <= PP.cpMax; i++) {
                let p = this.__points[i];
                for (let ii = PC.ccMin; ii <= PC.ccMax; ii++) {
                    for (let iii = 0; iii < p.one[ii]; iii++)
                        pp.refadd(new Card(i, ii));
                }

            }
            return pp;
        }

        set(pile: CardPile | CardSet): CardSet {
            if (pile instanceof CardPile) {
                this.clear()
                for (let i = 0; i < pile.list.length; i++)
                    this.add(pile.list[i])
            } else {
                for (let i in this.__points) {
                    let src = this.__points[i]
                    let tag = pile.__points[i]
                    for (let ii in src.one) src.one[ii] = tag.one[ii]
                    src.all = tag.all;
                }
                this.__count = pile.__count;
            }
            return this;
        }

        get(point: number): CardPoint {
            return this.__points[point];
        }

        add(point: number | CardSet | Card | CardPile, color?: number, n?: number): CardSet {
            if (point instanceof Card) {
                this.__points[point.point].one[point.color]++;
                this.__points[point.point].all++;
                this.__count++;
            } else if (point instanceof CardPile) {
                for (let i = 0; i < point.list.length; i++) {
                    let c = point.list[i]
                    this.__points[c.point].one[c.color]++;
                    this.__points[c.point].all++;
                    this.__count++;
                }
            } else if (point instanceof CardSet) {
                for (let i in point.__points) {
                    let src = this.__points[i]
                    let tag = point.__points[i]
                    for (let ii in src.one) src.one[ii] += tag.one[ii]
                    src.all += tag.all;
                }
                this.__count += point.__count;
            } else if (point) {
                color = color || PC.ccMin;
                n = n || 1;
                this.__points[point].one[color]++;
                this.__points[point].all++;
                this.__count++;
            }
            return this;
        }

        /**
         * 根据card的内容填充point到n张，如果当前point的数量+card的数量超过了n，则将会被裁减，否则被填充
         * @param point 
         * @param card 
         * @param n 
         */
        filladd(point: number, card: CardPoint, n?: number): CardSet {
            n = n || card.all;
            let p = this.__points[point];
            let old = p.all;
            p.all += card.all;
            for (let i in card.one) p.one[i] += card.one[i];
            let nall = n + old;
            if (n > card.all) {
                while (p.all < nall) {
                    for (let cc = PC.ccMax; cc >= PC.ccMin; cc--) {
                        if (p.one[cc] > 0) {
                            p.one[cc]++; p.all++; break;
                        } else if (cc === PC.ccMin) {
                            p.one[cc]++; p.all++;
                        }
                    }
                }
            } else {
                while (p.all > nall) {
                    for (let cc = PC.ccMax; cc >= PC.ccMin; cc--) {
                        if (p.one[cc] > 0) {
                            p.one[cc]--; p.all--; break;
                        }
                    }
                }
            }
            this.__count += p.all - old;
            return this;
        }

        sub(point: CardSet | number, color?: number, n?: number): CardSet {
            if (point instanceof CardSet) {
                this.__count = 0;
                for (let i in this.__points) {
                    let src = this.__points[i];
                    let tag = point.__points[i];
                    tag.all = src.all = 0;
                    for (let ii in src.one) {
                        src.one[ii] -= tag.one[ii]
                        if (src.one[ii] < 0) src.one[ii] = 0;
                        src.all += src.one[ii];
                    }
                    this.__count += src.all;
                }
            } else if (!color) {
                let p = this.__points[point]
                n = n || 1;
                while (p.all > 0 && n > 0) {
                    for (let ii in p.one) {
                        if (p.one[ii] > 0) {
                            p.one[ii]--
                            p.all--
                            this.__count--
                            if (--n <= 0) break;
                        }
                    }
                }
            } else {
                n = n || 1
                let p = this.__points[point]
                while (n > 0 && p.one[color] > 0) {
                    p.one[color]--
                    p.all--
                    this.__count--
                    if (--n <= 0) break;
                }
            }
            return this;
        }

        has(pile: CardSet): boolean {
            for (let i in this.__points) {
                let src = this.__points[i]
                let tag = pile.__points[i]
                if (src.all < tag.all) return false;
                for (let ii in src.one) if (src.one[ii] < tag.one[ii]) return false;
            }
            return true;
        }

        clear(): CardSet {
            for (let i in this.__points) {
                let src = this.__points[i]
                for (let ii in src.one) src.one[ii] = 0
                src.all = 0;
            }
            this.__count = 0;
            return this;
        }

        numof(point: number, color?: number): number {
            return color ? this.__points[point].one[color] : this.__points[point].all
        }
    }

    export class CardPile {
        private __list: Card[];
        private __key: Card;
        private __type: CardType | null;
        constructor(src?: string | Card | Card[] | CardPile, checkvalid: boolean = true) {
            this.__list = new Array()
            this.__key = new Card();
            this.__type = null;
            if (src) this.add(src, checkvalid);
        }

        get list(): Card[] { return this.__list; }
        get key(): Card { return this.__key; }
        set key(v: Card) { this.__key.set(v); }
        get type(): CardType | null { return this.__type; }
        set type(v: CardType | null) { this.__type = v; }
        get count(): number { return this.__list.length; }
        get length(): number { return this.__list.length; }

        set(src: string | Card | Card[] | CardPile, checkvalid: boolean = true): CardPile {
            this.clear();
            return this.add(src, checkvalid);
        }

        add(src: string | Card | Card[] | CardPile, checkvalid: boolean = true): CardPile {
            let cards = Card.expand(src, checkvalid, this.__list);
            this.__key.clear();
            this.__type = null;
            return this;
        }

        refadd(cards: Card | Card[] | CardPile): CardPile {
            if (Array.isArray(cards)) this.__list.push.apply(this.__list, cards)
            else if (cards instanceof Card) this.__list.push(cards)
            else if (cards instanceof CardPile) this.__list.push.apply(this.__list, cards.__list)
            this.__key.clear();
            this.__type = null;
            return this;
        }

        /**
         * 填充n张指定的牌,如果不指定则使用背景牌
         * @param n 
         */
        fill(n: number, c?: Card, useref?: boolean): CardPile {
            c = c || new Card();
            while (n-- > 0) {
                if (useref) this.__list.push(c);
                else this.__list.push(new Card(c));
            }
            return this;
        }

        has(src: CardPile | CardSet): boolean {
            if (src instanceof CardSet) return new CardSet(this).has(src);
            else return new CardSet(this).has(new CardSet(src));
        }

        clear(): CardPile {
            this.__list.splice(0);
            this.__key.clear();
            this.__type = null;
            return this;
        }

        at(index: number): Card { return this.__list[index]; }

        erase(index: number): CardPile {
            this.__list.splice(index, 1);
            this.__key.clear();
            this.__type = null;
            return this;
        }
        remove(...cards: any[]): Card[] {
            cards = this.filter(cards)
            for (let i = cards.length - 1; i >= 0; i--) {
                this.__list.splice(cards[i].index, 1);
            }
            this.__key.clear();
            this.__type = null;
            return cards;
        }
        filter(...cards: any[]): Card[] {
            if (cards.length === 0) return [];
            let flags = cards[cards.length - 1]
            if (typeof (flags) === 'number') {
                cards.pop();
            } else {
                flags = 0;
            }
            let m = 0 != (flags & FILTER_FLAGS.MATCH_STATUS)
            let a = 0 != (flags & FILTER_FLAGS.FIND_ALL)
            let ret = [];
            cards = Card.expand(cards, true);
            for (let i = 0; i < this.__list.length; i++) {
                let v = this.__list[i]
                for (let ii = 0; ii < cards.length; ii++) {
                    let c = cards[ii]
                    if (c === v || c.point === v.point && c.color == v.color && (!m || c.status === v.status)) {
                        (<any>v).index = i
                        ret.push(v);
                        if (!a) { cards.splice(ii, 1); }
                        break;
                    }
                }
            }
            return ret;
        }
        tostring(): string {
            let p = [];
            for (let i = 0; i < this.__list.length; i++) {
                p.push(this.__list[i].name)
            }
            return p.join(',')
        }
        tocodes(): string {
            let p = [];
            for (let i = 0; i < this.__list.length; i++) {
                p.push(this.__list[i].code)
            }
            return p.join(',')
        }
        tovalues(): Array<number> {
            let p = [];
            for (let i = 0; i < this.__list.length; i++) {
                p.push(this.__list[i].value)
            }
            return p
        }
        /**
         * 排序
         * @param lib 牌型库
         * @param type 支持point,value,color,num四种排序方式
         * @param desc 降序
         */
        sort(lib: CardLib, type: string = 'value', desc: boolean = false): CardPile {
            let nosort = this.filter(lib.nosort, cardlib.FILTER_FLAGS.FIND_ALL);
            nosort.sort(lib.compare_card.bind(lib)); nosort.reverse();
            this.remove(nosort);
            if (type == 'num') {
                let s = new CardSet(this);
                let lst = [];
                let p;
                let iv = 0;
                while ((p = lib.next_point(p)) != PP.cpNull) {
                    let a = s.get(p);
                    if (a.all === 0) continue;
                    (<any>a).point = p;
                    (<any>a).value = iv++;
                    lst.push(a);
                }
                lst.sort((a, b) => { let ret = a.all - b.all; return ret != 0 ? (desc ? -ret : ret) : (<any>b).value - (<any>a).value; })
                this.__list.splice(0);
                for (let i = 0; i < lst.length; i++) {
                    let c
                    p = lst[i]
                    while ((c = lib.next_color(c)) != PC.ccNull) {
                        for (let ii = 0; ii < p.one[c]; ii++)
                            this.__list.push(new Card((<any>p).point, c))
                    }
                }
            } else if (type == 'color') {
                // 先按大小从小到大排序
                this.__list.sort(lib.compare_card.bind(lib));
                let cc = [];
                let c;
                while ((c = lib.next_color(c)) != PC.ccNull) cc.push(c);
                if (desc) cc.reverse();
                let lst: Card[] = [];
                for (let i = 0; i < cc.length; i++) {
                    for (let ii = this.__list.length - 1; ii >= 0; ii--) {
                        c = this.__list[ii];
                        if (c.color !== cc[i]) continue;
                        lst.push(c);
                        this.__list.splice(ii, 1);
                    }
                }
                this.__list = lst;
            } else if (type === 'point') {
                this.__list.sort((a, b) => {
                    let r = lib.serial_point_index(a.point) - lib.serial_point_index(b.point);
                    return r === 0 ? (a.color - b.color) : (desc ? -r : r);
                });
            } else {
                this.__list.sort((a, b) => {
                    let r = lib.compare_card(a, b);
                    return r === 0 ? (a.color - b.color) : (desc ? -r : r);
                });
            }
            nosort.sort(lib.compare_card.bind(lib));
            this.__list = nosort.concat.apply(nosort, this.__list);
            return this;
        }
    }

    export class CardLib {
        private __types: { [code: string]: CardType };
        private __sorted_types: CardType[];// 从小到大排列的牌型
        private __cantbe: CardSet;
        private __baida: Card[];
        private __nosort: Card[];
        private __serial_n: number;
        private __serial_i2p: { [index: number]: number };
        private __serial_p2i: { [index: number]: number };
        private __value_v2p: { [index: number]: number };
        private __value_p2v: { [index: number]: number };
        private __value_c2v: { [index: number]: number };
        private __value_min: number;
        private __value_max: number;
        private __sorted_colors: number[];

        constructor() {
            this.__types = {};
            this.__sorted_types = [];
            this.__cantbe = new CardSet();
            this.__baida = [];
            this.__nosort = [];
            this.__serial_n = 0;
            this.__serial_i2p = {};
            this.__serial_p2i = {};
            this.__value_v2p = {};
            this.__value_p2v = {};
            this.__value_c2v = {};
            this.__value_min = PP.cpMin;
            this.__value_max = PP.cpMax;
            this.__sorted_colors = [];

            this.set_point_value([PP.cp3, PP.cp4, PP.cp5, PP.cp6, PP.cp7, PP.cp8, PP.cp9, PP.cp10, PP.cpJ, PP.cpQ, PP.cpK, PP.cpA, PP.cp2, PP.cpXa, PP.cpXb, PP.cpXc])
            this.set_color_value({ s: 0, h: 0, c: 0, d: 0 })
            this.set_serial([PP.cpA, PP.cp2, PP.cp3, PP.cp4, PP.cp5, PP.cp6, PP.cp7, PP.cp8, PP.cp9, PP.cp10, PP.cpJ, PP.cpQ, PP.cpK])
            this.set_baida('', 'xa,xb')
            this.set_nosort('xa,xb')
        }

        initialize(rule: OptionCardRule) {
            this.__types = {}
            this.__sorted_types = [];
            if (rule.values) {
                this.set_point_value(rule.values.point);
                this.set_color_value(rule.values.color);
            }
            if (rule.baida) {
                this.set_baida(rule.baida.cards, rule.baida.cantbe);
            }
            if (rule.serials) {
                this.set_serial(rule.serials);
            }
            this.add_type({ id: 0, name: '不要', code: 'pass', value: -1 }, false);
            if (rule.types) {
                this.__sorted_types = [];
                for (let i in rule.types)
                    this.__sorted_types.push(this.add_type(rule.types[i], false));
                this.__sorted_types.sort((a, b) => {
                    return a.value - b.value;
                })
            }
        }

        /**
         * 设置点值大小，按从小到大的顺序填入点值
         * @param pvs 
         */
        set_point_value(pvs: number[]) {
            let cards = Card.expand(pvs, false)
            this.__value_p2v = {};
            this.__value_v2p = {};
            this.__value_min = PP.cpMax;
            this.__value_max = PP.cpMin;
            for (let i = 0; i < cards.length; i++) {
                let c = cards[i]
                if (!c.point_valid) throw `点值[${i}]无效`
                this.__value_p2v[c.point] = i
                this.__value_v2p[i] = c.point;
                this.__value_min = Math.min(this.__value_min, i)
                this.__value_max = Math.max(this.__value_max, i)
            }
        }

        /**
         * 设置花色大小
         * @param cc 使用color->value映射表 {Spade:1,Heart:2,Club:0,Diamond:0}表示红心比黑桃大
         */
        set_color_value(cc: any) {
            this.__value_c2v = {};
            this.__sorted_colors = [];
            for (let i in cc) {
                let card = new Card(i)
                if (!card.color_valid) throw `花色[${i}]无效`
                this.__value_c2v[card.color] = cc[i]
                this.__sorted_colors.push(card.color);
            }
            this.__sorted_colors.sort((a: number, b: number) => {
                let v = this.__value_c2v[a] - this.__value_c2v[b]
                return v === 0 ? a - b : v;
            })
        }

        /**
         * 设置可以连续的点，按顺序填入点值
         * @param points 
         */
        set_serial(points: number[] | string) {
            this.__serial_i2p = {}
            this.__serial_p2i = {}
            this.__serial_n = 0
            let cards = Card.expand(points, false)
            for (let i = 0; i < cards.length; i++) {
                let c = cards[i]
                if (!c.point_valid) throw `点值[${i}]无效`
                this.__serial_i2p[i] = c.point;
                this.__serial_p2i[c.point] = i;
            }
            this.__serial_n = cards.length;
        }

        serial_point_index(point: number): number {
            return this.__serial_p2i[point] || -1;
        }

        next_serial_point(point?: number): number {
            if (!point) return this.__serial_i2p[0];
            let idx = this.__serial_p2i[point];
            if (idx === undefined) return PP.cpNull;
            let p = this.__serial_i2p[++idx]
            return p ? p : PP.cpNull;
        }

        point_value(point: number): number {
            return this.__value_p2v[point] || -1;
        }

        next_point(point?: number): number {
            if (!point) return this.__value_v2p[0];
            let idx = this.__value_p2v[point];
            if (idx === undefined) return PP.cpNull;
            let p = this.__value_v2p[++idx]
            return p ? p : PP.cpNull;
        }
        next_color(color?: number): number {
            if (!color) return this.__sorted_colors[0];
            let benext = false;
            for (let i = 0; i < this.__sorted_colors.length; i++) {
                if (benext) return this.__sorted_colors[i];
                else if (this.__sorted_colors[i] === color) benext = true;
            }
            return PC.ccNull;
        }
        length_of_point(p1?: number, p2?: number): number {
            let i1 = p1 !== undefined ? this.__value_p2v[p1] : undefined;
            let i2 = p2 !== undefined ? this.__value_p2v[p2] : undefined;
            let n = this.__value_max - this.__value_min + 1
            if (i1 != undefined && i2 != undefined) {
                return i1 < i2 ? (i2 - i1 + 1) : (n - i1 + i2 + 1);
            } else if (i1 != undefined) {
                return n - i1 + 1;
            } else if (i2 != undefined) {
                return i2;
            } else {
                return n;
            }
        }

        length_of_serial_point(p1?: number, p2?: number): number {
            return p1 && p2 ? this.length_of_serial(this.__serial_p2i[p1], this.__serial_p2i[p2])
                : (p1 ? this.length_of_serial(this.__serial_p2i[p1]) : (p2 ? this.length_of_serial(undefined, this.__serial_p2i[p2]) : this.length_of_serial()))
        }

        length_of_serial(i1?: number, i2?: number): number {
            if (i1 != undefined && i2 != undefined) {
                return i1 < i2 ? (i2 - i1 + 1) : (this.__serial_n - i1 + i2 + 1);
            } else if (i1 != undefined) {
                return this.__serial_n - i1 + 1;
            } else if (i2 != undefined) {
                return i2;
            } else {
                return this.__serial_n;
            }
        }

        /**
         * 生成指定的n副牌
         * @param count 需要生成多少副牌
         */
        deal(count: number = 1): Card[] {
            let s = []
            for (let i = 0; i < count; i++) {
                for (let _c = PC.ccMin; _c <= PC.ccMax; _c++) {
                    for (let _p = PP.cpMin; _p <= PP.cpK; _p++) {
                        s.push(new Card(_p, _c))
                    }
                }
                s.push(new Card(PP.cpXa, PC.ccMin))
                s.push(new Card(PP.cpXb, PC.ccMin))
            }
            return s;
        }

        /**
         * 设置百搭牌
         * @param baida 百搭牌，接受可以转换成card的任何参数
         * @param cantbe 百搭不能转换成哪些牌，任何可以转换成card的参数
         */
        set_baida(baida: any, cantbe?: any) {
            this.__baida = []
            baida = Card.expand(baida);
            for (let i in baida) {
                let c = baida[i]
                if (c.valid) this.__baida.push(c);
            }
            if (cantbe != undefined) {
                cantbe = Card.expand(cantbe)
                this.__cantbe.clear();
                for (let i in cantbe) {
                    let c = cantbe[i]
                    if (c.point_valid || c.color_valid) this.__cantbe.add(c.point, c.color)
                }
            }
        }

        /**
         * 设置不排序的牌，这些牌总会被放在最前端，并且按照大小排序
         * @param cards 接受可以转换成card的任何参数
         */
        set_nosort(cards: any) {
            this.__nosort = Card.expand(cards);
        }
        get nosort(): Card[] { return this.__nosort; }

        /**
         * 添加牌型
         * @param rule 规则
         * @param sort 是否排序
         */
        add_type(rule: OptionCardType, sort: boolean): CardType {
            let t: any = {};
            t.id = rule.id;
            t.name = rule.name;
            t.code = rule.code;
            t.value = rule.value || 0;
            t.enabled = rule.enabled === undefined ? true : rule.enabled;
            t.mincount = 0;
            t.maxcount = 0;
            t.styles = [];
            t.each = 0;
            t.keystyle = null;
            t.onelength = rule.onelength == undefined ? false : rule.onelength;
            const as = (s: OptionCardStyle) => {
                let style: any = {}
                if (s.each <= 0) throw `牌型[${rule.name}]样式的牌数必须大于0`;
                if (s.length <= 0) throw `牌型[${rule.name}]样式的长度必须大于0`;
                style.each = s.each;
                style.length = s.length;
                style.serial = s.serial || false;
                style.point = s.point ? new Card(s.point).point : PP.cpNull;
                style.comparelength = typeof (s.comparelength) === 'boolean' ? s.comparelength : true;
                style.key_is_the_min = s.howgetkey != 'max';
                if (s.color) {
                    style.color = {};
                    let bany = false;
                    let cards = Card.expand(s.color, false);
                    for (let i in cards) {
                        if (cards[i].color_valid) {
                            bany = true;
                            style.color[cards[i].color] = cards[i].color;
                        }
                    }
                    if (!bany) delete style.color;
                }
                style.samecolor = s.samecolor || false
                if (s.serial) {
                    style.serial_begin = s.serial_begin ? new Card(s.serial_begin).point : PP.cpNull;
                    style.serial_end = s.serial_end ? new Card(s.serial_end).point : PP.cpNull;
                    style.serial_begin = this.__serial_p2i.hasOwnProperty(style.serial_begin) ? this.__serial_p2i[style.serial_begin] : 0
                    style.serial_end = this.__serial_p2i.hasOwnProperty(style.serial_end) ? this.__serial_p2i[style.serial_end] : this.length_of_serial() - 1
                }
                if (s.matchtype == '<=') style.matchtype = _MATCHTYPE.LE;
                else if (s.matchtype == '>=') style.matchtype = _MATCHTYPE.GE;
                else style.matchtype = _MATCHTYPE.EQ;

                if (style.matchtype != _MATCHTYPE.LE) {
                    t.mincount += style.each * style.length
                    t.maxcount += style.matchtype == _MATCHTYPE.GE ? (style.each * (style.serial ? this.length_of_serial(style.serial_begin, style.serial_end) : (PP.cpMax - PP.cpMin))) : style.each * style.length
                } else {
                    t.maxcount += style.each * style.length
                }
                if (t.styles.length === 0) {
                    style.ismain = true;
                    t.keystyle = style;
                }
                t.each += style.each;
                t.styles.push(style)
            }
            if (rule.styles) {
                for (let i = 0; i < rule.styles.length; i++) {
                    as(rule.styles[i])
                }
            }
            let name = t.code.toLowerCase();
            let old = this.__types[name]
            if (old) {
                throw `牌型名称[${t.code}]重复`
            }
            if (t.id != undefined) {
                if (this.__types[t.id])
                    throw `牌型ID[${t.id}]重复`
                this.__types[t.id] = t;
            }
            this.__types[name] = t
            this.__sorted_types.push(t);
            if (sort) {
                this.__sorted_types.sort((a, b) => {
                    return a.value - b.value;
                })
            }
            return t;
        }

        find_type(code: string | number): CardType { return this.__types[`${code}`.toLowerCase()]; }

        /**
         * 比较两张牌的大小
         * @param c1 
         * @param c2 
         */
        compare_card(c1: Card, c2: Card): number {
            if (c1.color == c2.color) {
                return this.__value_p2v[c1.point] - this.__value_p2v[c2.point];
            } else {
                let n = this.__value_c2v[c1.color] - this.__value_c2v[c2.color];
                return n !== 0 ? n : this.__value_p2v[c1.point] - this.__value_p2v[c2.point];
            }
        }

        compare_cards(cards1: any, cards2: any): number {
            cards1 = cards1 instanceof CardPile ? cards1 : new CardPile(cards1)
            cards2 = cards2 instanceof CardPile ? cards2 : new CardPile(cards2)
            if (!cards1.type) {
                this.typeof(cards1)
            }
            if (!cards2.type) {
                this.typeof(cards2)
            }
            if (cards1.type && !cards2.type) {
                return 1
            } else if (!cards1.type && cards2.type) {
                return -1;
            } else if (cards1.type == cards2.type) {
                if (cards1.type.keystyle.comparelength && cards1.count !== cards2.count)
                    return -99;
                else if (cards1.type.keystyle.serial)
                    return this.__serial_p2i[cards1.key.point] - this.__serial_p2i[cards2.key.point]
                else
                    return this.compare_card(cards1.key, cards2.key);
            } else {
                let n = cards1.type.value - cards2.type.value;
                return n === 0 ? -99 : n;
            }
        }

        /**
         * 获取给定牌的牌型
         * @param cards 源牌堆
         * @param fromlarge 是否从大牌型开始检测，默认为true
         * @returns {src:源牌堆,pile:实际手牌,out:转换后的牌,type:牌型,filled:填充的牌} or null
         */
        typeof(cards: any, fromlarge: boolean = true): ParseResult | null {
            return this._test_type(cards, null, PP.cpNull, this.__baida, this.__cantbe, fromlarge, 0, true);
        }

        /**
         * 从提供的牌堆里查找指定牌型的牌
         * @param cards 源牌堆
         * @param typeorname 牌型或者牌型code
         * @param count 需要多少张牌
         * @param fromlarge 从大开始
         * @param fromkey 从这个key开始，不指定将从适合这个牌型的最小key开始(只在从小开始查找模式生效)
         * @returns {src:源牌堆,pile:实际手牌,out:转换后的牌,type:牌型,filled:填充的牌} or null
         */
        find_type_cards(cards: any, typeorname: string | CardType, count: number = 0, fromlarge: boolean = false, fromkey: number = PP.cpNull): ParseResult | null {
            let type = typeof (typeorname) === 'string' ? this.find_type(typeorname) : typeorname;
            if (!type) throw `无效的牌型名称[${typeorname}]`
            count = count || type.mincount;
            let ret = this._test_type(cards, type, fromkey, this.__baida, this.__cantbe, fromlarge, count, false);
            if (!ret) return null;
            ret.pile.__type = null;
            ret.pile.__key.clear();
            if (ret.filled) {
                let pile = ret.out;
                let out = new CardPile(pile);
                pile.remove(ret.filled);
                let baidacards = ret.src.filter(this.__baida, FILTER_FLAGS.FIND_ALL)
                for (let i = 0; i < ret.filled.count; i++) {
                    //百搭数量肯定大于填充的数量，所以这里无需检测越界
                    pile.refadd(baidacards.shift())
                }
                ret.out = out;
                ret.pile = pile;
                pile.type = out.type = ret.type;
                pile.key = out.key = ret.key;
            }
            return ret;
        }

        /**
         * 检测给定的牌是否满足给定的牌型(总是按最大值匹配)
         * @param cards 源牌堆
         * @param type 牌型或者牌型code
         * @param fromlarge 默认从大开始
         */
        is_cards_match_type(cards: any, type: string | CardType, fromlarge: boolean = true): boolean {
            cards = cards instanceof CardPile ? cards : new CardPile(cards);
            let ret = this.find_type_cards(cards, type, 0, fromlarge);
            if (!ret) return false;
            if (ret.pile.count == cards.count) {
                cards.type = ret.type
                cards.key = ret.key
                return true;
            } else {
                return false;
            }
        }

        /**
         * 从提供的牌堆里查找比给定牌大的牌
         * @param cards 源牌堆
         * @param target 目标手牌
         * @returns {src:源牌堆,pile:实际手牌,out:转换后的牌,type:牌型,filled:填充的牌} or null
         */
        find_great_cards(cards: any, target: any): ParseResult | null {
            let type = typeof (target) === 'object' ? (target.type || null) : null;
            target = target instanceof CardPile ? target : new CardPile(target);
            let key
            if (!type) {
                let ret = this.typeof(target);
                if (!ret) return null;
                type = ret.type;
                key = ret.out.key.point;
            } else {
                key = target.key.point;
            }
            cards = cards instanceof CardPile ? cards : new CardPile(cards);
            let nextkey = type.serial ? this.next_serial_point(key) : this.next_point(key)
            if (nextkey != PP.cpNull) {
                let ret = type.value >= 0 ? this.find_type_cards(cards, type, target.count, false, nextkey) : null;
                if (ret) return ret;
            }
            for (let i = 0; i < this.__sorted_types.length; i++) {
                let t = this.__sorted_types[i]
                if (t.value > type.value && t.enabled) {
                    let ret = this.find_type_cards(cards, t, 0, false)
                    if (ret) return ret;
                }
            }
            return null;
        }

        _test_type(cards: any, thetype: CardType | null, startpoint: number, baida: Card[] | null, cantbe: CardSet | null, fromlarge: boolean, needcardscount: number, fullmatch: boolean): any {
            const retf = function (pile: any, type: any, typepile: any, key: any, filled: any) {
                let out
                let src = pile;
                if (typepile) {
                    out = typepile
                    out.__key.set(key)
                    out.__type = type
                } else {
                    out = pile
                }
                if (fullmatch || !typepile) {
                    pile.__key.set(key)
                    pile.__type = type;
                } else {
                    pile = out;
                }
                return { src: src, pile: pile, type: type, key: key, out: out, filled: filled };
            }
            let pile = cards
            if (!(pile instanceof CardPile)) {
                pile = new CardPile(cards)
            }
            if (pile.count == 0) return retf(pile, this.find_type(_CARDTYPE_PASS), null, PP.cpNull, null);
            let baidacards = baida ? pile.filter(baida, FILTER_FLAGS.FIND_ALL) : [];
            needcardscount = needcardscount || pile.count;
            if (baidacards.length == pile.count) return this._test_type(pile, thetype, startpoint, null, null, fromlarge, needcardscount, fullmatch);

            let source = new CardSet(pile);
            let baidamap: any = {}
            for (let i = 0; i < baidacards.length; i++) {
                let c = baidacards[i];
                source.sub(c.point, c.color);
                baidamap[c.point] = true;
            }

            let info: any = {
                source: source,
                filled: new CardSet(),
                typecards: new CardSet(),
                keycard: new Card(),
                baida: baidacards,
                baidamap: baidamap,
                cantbe: cantbe,
            }

            let st = thetype ? 0 : (!fromlarge ? 0 : this.__sorted_types.length - 1)
            let ed = thetype ? this.__sorted_types.length - 1 : (!fromlarge ? this.__sorted_types.length : -1)
            let step = st < ed ? 1 : -1;
            for (let i = st; i != ed; i += step) {
                let type = thetype || this.__sorted_types[i];
                if (type.enabled) {
                    let n = this._get_type_cards(type, startpoint, fromlarge, info, needcardscount);
                    if (fullmatch && n == pile.count || n > 0 && !fullmatch && n <= pile.count) {
                        return retf(pile, type, info.typecards.pile, info.keycard, info.filled.count > 0 ? info.filled.pile : null);
                    }
                }
            }
            return null;
        }

        _get_type_cards(type: CardType, startpoint: number, fromlarge: boolean, info: any, need: number): number {
            let neach = type.each;
            let needst, needed;
            if (neach <= 0) return 0;
            if (need > 0) {
                if (need < type.mincount || need > type.maxcount) return 0;
                needst = needed = need;
            } else {
                needst = type.mincount;
                needed = type.maxcount;
                if (needst > info.source.count + info.baida.length) return 0;
            }

            needst = Math.floor(needst / neach)
            needed = Math.floor(needed / type.keystyle.each);
            if (!info.sourcebk) {
                info.sourcebk = new CardSet(info.source);
            }
            if (type.keystyle.serial) {
                let maxs = type.keystyle.serial_end == type.keystyle.serial_begin ? this.__serial_n - 1 : type.keystyle.serial_end;
                let mins = type.keystyle.serial_end == type.keystyle.serial_begin ? 0 : type.keystyle.serial_begin;
                let st = startpoint != PP.cpNull ? this.__serial_p2i[startpoint] : (fromlarge ? maxs : mins);
                let ed = fromlarge ? mins - 1 : maxs + 1;
                let step = st < ed ? 1 : -1;
                for (let nd = needed; nd >= needst; nd--) {
                    for (let i = st; i != ed; i += step) {
                        info.keycard.set(this.__serial_i2p[i], PC.ccNull);
                        if (-1 != this._patch_type_cards(type, info.keycard.point, info, nd)) {
                            if (info.filled.count <= info.baida.length)
                                return info.typecards.count;
                        }
                        info.source.set(info.sourcebk)
                    }
                }
            } else {
                let st = startpoint != PP.cpNull ? this.__value_p2v[startpoint] : (fromlarge ? this.__value_max : this.__value_min);
                let ed = fromlarge ? this.__value_min - 1 : this.__value_max + 1;
                let step = st < ed ? 1 : -1;
                for (let nd = needed; nd >= needst; nd--) {
                    for (let i = st; i != ed; i += step) {
                        info.keycard.set(this.__value_v2p[i], PC.ccNull);
                        if (-1 != this._patch_type_cards(type, info.keycard.point, info, nd)) {
                            if (info.filled.count <= info.baida.length)
                                return info.typecards.count;
                        }
                        info.source.set(info.sourcebk)
                    }
                }
            }
            return 0;
        }

        _patch_type_cards(type: CardType, startpoint: number, info: any, need: number): number {
            info.stylecards = info.stylecards || new CardSet()
            info.filledtmp = info.filledtmp || new CardSet();
            info.lastsource = info.lastsource || new CardSet();
            info.filledtmp.clear();
            info.filled.clear();
            info.typecards.clear();

            let nallfilled = 0;
            let nstylefilled = [];
            for (let i = 0; i < type.styles.length; i++) {
                let style = type.styles[i];
                info.stylecards.clear();
                info.lastsource.set(info.source);
                let stpoint = style.ismain ? startpoint : PP.cpNull;
                let nfilled = this._patch_style_cards(style, stpoint, info, style.ismain ? need : 0);
                if (nfilled < 0) return -1;
                info.filledtmp.set(info.stylecards);
                info.filledtmp.sub(info.lastsource);
                info.filled.add(info.filledtmp);
                info.typecards.add(info.stylecards);
                nallfilled += nfilled;
                nstylefilled.push(Math.floor(info.stylecards.count / style.each))
            }
            if (type.onelength) {
                let nowlen
                for (let i = 0; i < nstylefilled.length; i++) {
                    if (nowlen === undefined) nowlen = nstylefilled[i]
                    else if (nowlen != nstylefilled[i]) return -1;
                }
            }
            return nallfilled;
        }

        /**
         * 填充样式，并返回实际填充数量
         * @param style 
         * @param stpoint 
         * @param info 
         * @param need 
         */
        _patch_style_cards(style: CardStyle, stpoint: number, info: any, need: number): number {
            let filter = { points: new Array<number>(), colors: new Array<number>() };
            if (!this._create_filter(style, filter, info)) return 0;
            let stidx = stpoint == PP.cpNull ? 0 : filter.points.indexOf(stpoint);
            if (stidx == -1) return -1;
            if (info.baida.length > 0) {
                let nfinallyfilled = -1;
                let finallypoints = new Array<number>();
                let ccfilled
                for (let _cc = 0; _cc < filter.colors.length; _cc++) {
                    let cc = filter.colors[_cc];
                    let nfilled = 0
                    let filledpoints = [];
                    let st = stidx;
                    if (stpoint != PP.cpNull) {
                        let nexists = info.source.numof(stpoint, cc)
                        if (nexists < style.each && info.cantbe.numof(stpoint, cc) <= 0) {
                            if (style.ismain && nexists == 0 && style.length == 1 && info.baidamap[stpoint])// 主键不能完全用百搭代替
                                return -1;
                            nfilled += style.each - nexists;
                            filledpoints.push(stpoint);
                            st++;
                        } else if (nexists >= style.each) {
                            filledpoints.push(stpoint);
                            st++;
                        }
                    }
                    if (!this._is_length_match_style(style, need, filledpoints.length)) {
                        if (style.serial) {
                            for (let i = st; i < filter.points.length; i++) {
                                let p = filter.points[i]
                                let nexists = info.source.numof(p, cc);
                                if (nexists < style.each) {
                                    if (this._is_length_match_style(style, need, filledpoints.length)) {
                                        break;
                                    } else if (info.cantbe.numof(p, cc) > 0) {
                                        filledpoints.splice(0);
                                        nfilled = 0;
                                    } else {
                                        nfilled += style.each - nexists;
                                        filledpoints.push(p);
                                    }
                                } else {
                                    filledpoints.push(p);
                                }
                                if (this._is_length_match_style(style, need, filledpoints.length))
                                    break;
                            }
                            if (filledpoints.length > 1 && filledpoints.length == filter.points.length && filledpoints[0] == filledpoints[filledpoints.length - 1])
                                filledpoints.shift();
                        } else {
                            for (let i = st; i < filter.points.length; i++) {
                                let p = filter.points[i];
                                let nexists = info.source.numof(p, cc);
                                if (nexists < style.each) {
                                    if (this._is_length_match_style(style, need, filledpoints.length))
                                        break;
                                } else {
                                    let done = false;
                                    for (let ii = 0; ii < Math.floor(nexists / style.each); ii++) {
                                        filledpoints.push(p);
                                        if (this._is_length_match_style(style, need, filledpoints.length)) {
                                            done = true;
                                            break;
                                        }
                                    }
                                    if (done) break;
                                }
                            }
                        }
                    }

                    /**第二次检查 */
                    if (!this._is_length_match_style(style, need, filledpoints.length)) {
                        if (style.serial) {
                            let needcheck = false;
                            if (style.serial_begin == style.serial_end) {
                                let minserial = this.__serial_i2p[style.serial_begin]
                                if (filledpoints.length == filter.points.length - 1 && info.source.numof(minserial, cc) >= style.each * 2) {
                                    filledpoints.push(minserial);
                                    needcheck = true;
                                }
                            }

                            if (!needcheck || needcheck && !this._is_length_match_style(style, need, filledpoints.length)) {
                                if (stpoint == PP.cpNull) {
                                    let j = filter.points.indexOf(filledpoints[0]) - 1;
                                    for (let i = j; i >= 0; i--) {
                                        let p = filter.points[i];
                                        if (info.cantbe.numof(p, cc) > 0)
                                            break;
                                        filledpoints.push(p);
                                        let nexists = info.source.numof(p, cc)
                                        nfilled += nexists < style.each ? (style.each - nexists) : 0;
                                        if (this._is_length_match_style(style, need, filledpoints.length))
                                            break;
                                    }
                                }
                            }
                        } else if (!style.ismain || stpoint == PP.cpNull) {/**非主样式才能使用排序填充 */
                            let points = this._sort_points_by_count(info.source, filter.points, cc)
                            st = stpoint == PP.cpNull ? 0 : points.indexOf(stpoint);
                            for (let i = st; i < points.length; i++) {
                                let p = points[i];
                                if (info.cantbe.numof(p, cc) > 0) continue;
                                let nexists = info.source.numof(p, cc);
                                if (nexists % style.each != 0) {
                                    filledpoints.push(p);
                                    let nexists = info.source.numof(p, cc)
                                    nfilled += nexists < style.each ? (style.each - nexists) : 0;
                                    if (this._is_length_match_style(style, need, filledpoints.length))
                                        break;
                                }
                            }
                            for (let i = st; i < points.length; i++) {
                                let p = points[i];
                                if (info.cantbe.numof(p, cc) > 0) continue;
                                let bdone = false;
                                while (!(bdone = this._is_length_match_style(style, need, filledpoints.length))) {
                                    filledpoints.push(p)
                                    nfilled += style.each;
                                }
                                if (bdone) break;
                            }
                        } else if (info.cantbe.numof(stpoint, cc) == 0) {
                            let points = this._sort_points_by_count(info.source, filter.points, cc)
                            st = points.indexOf(stpoint);
                            for (let i = st; i < points.length; i++) {
                                let p = points[i];
                                if (info.cantbe.numof(p, cc) > 0) continue;
                                let nexists = info.source.numof(p, cc);
                                if (nexists % style.each != 0) {
                                    filledpoints.push(p);
                                    let nexists = info.source.numof(p, cc)
                                    nfilled += nexists < style.each ? (style.each - nexists) : 0;
                                    if (this._is_length_match_style(style, need, filledpoints.length))
                                        break;
                                }
                            }
                            for (let i = st; i < points.length; i++) {
                                let p = points[i];
                                if (info.cantbe.numof(p, cc) > 0) continue;
                                let bdone = false;
                                while (!(bdone = this._is_length_match_style(style, need, filledpoints.length))) {
                                    filledpoints.push(p)
                                    nfilled += style.each;
                                }
                                if (bdone) break;
                            }
                        }
                    }

                    if (this._is_length_match_style(style, need, filledpoints.length)) {
                        if (nfinallyfilled == -1 || nfilled < nfinallyfilled) {
                            nfinallyfilled = nfilled;
                            finallypoints = filledpoints;
                            ccfilled = cc;
                        }
                        if (nfinallyfilled == 0) break;
                    }
                }

                if (this._is_length_match_style(style, need, finallypoints.length)) {
                    if (ccfilled == PC.ccNull) {
                        for (let i = 0; i < finallypoints.length; i++) {
                            let p = finallypoints[i];
                            info.stylecards.filladd(p, info.source.get(p), style.each);
                            info.source.sub(p, PC.ccNull, style.each);
                        }
                    } else {
                        for (let i = 0; i < finallypoints.length; i++) {
                            let p = finallypoints[i];
                            for (let ii = 0; ii < style.each; ii++) {
                                info.stylecards.add(p, ccfilled)
                                info.source.sub(p, ccfilled);
                            }
                        }
                    }
                    if (style.ismain) {
                        this._calc_key_card(style, filter.points, info);
                    }
                    return nfinallyfilled;
                }
                return -1;
            } else {
                for (let _cc = 0; _cc < filter.colors.length; _cc++) {
                    let cc = filter.colors[_cc];
                    let filledpoints = new Array<number>();
                    let nextcolor = false;
                    if (style.serial) {
                        for (let i = stidx; i < filter.points.length; i++) {
                            let p = filter.points[i];
                            if (info.source.numof(p, cc) < style.each) {
                                if (this._is_length_match_style(style, need, filledpoints.length)) {
                                    break;
                                } else if (cc != PC.ccNull && stpoint != PP.cpNull) {
                                    nextcolor = true;
                                    break;
                                } else {
                                    filledpoints.splice(0);
                                }
                            } else {
                                filledpoints.push(p);
                                if (this._is_length_match_style(style, need, filledpoints.length)) {
                                    break;
                                }
                            }
                        }
                        if (filledpoints.length > 1 && filledpoints.length == filter.points.length && filledpoints[0] == filledpoints[filledpoints.length - 1])
                            filledpoints.shift();
                    } else {
                        for (let i = stidx; i < filter.points.length; i++) {
                            let p = filter.points[i];
                            let n = info.source.numof(p, cc)
                            if (n < style.each) {
                                if (this._is_length_match_style(style, need, filledpoints.length))
                                    break;
                            } else {
                                let ok = false;
                                for (let ii = 0; ii < Math.floor(n / style.each); ii++) {
                                    filledpoints.push(p);
                                    if (this._is_length_match_style(style, need, filledpoints.length)) {
                                        ok = true;
                                        break;
                                    }
                                }
                                if (ok) break;
                            }
                        }
                    }

                    if (!nextcolor && this._is_length_match_style(style, need, filledpoints.length)) {
                        if (cc == PC.ccNull) {
                            for (let i = 0; i < filledpoints.length; i++) {
                                let p = filledpoints[i];
                                info.stylecards.filladd(p, info.source.get(p), style.each)
                                info.source.sub(p, PC.ccNull, style.each)
                            }
                        } else {
                            for (let i = 0; i < filledpoints.length; i++) {
                                let p = filledpoints[i];
                                for (let ii = 0; ii < style.each; ii++) {
                                    info.stylecards.add(p, cc)
                                    info.source.sub(p, cc);
                                }
                            }
                        }
                        if (style.ismain) {
                            this._calc_key_card(style, filter.points, info);
                        }
                        return 0;
                    }
                }
                return -1;
            }
        }

        _is_length_match_style(style: CardStyle, need: number, nowlength: number): boolean {
            if (style.matchtype == _MATCHTYPE.GE)
                return need > 0 && nowlength >= need && nowlength >= style.length || need <= 0 && nowlength >= style.length;
            else if (style.matchtype == _MATCHTYPE.LE)
                return need > 0 && nowlength <= need && nowlength <= style.length || need <= 0 && nowlength <= style.length;
            else
                return need ? nowlength == need : nowlength >= style.length;
        }

        /**
         * 计算当前样式的key
         * @param style 
         * @param points 
         * @param info 
         */
        _calc_key_card(style: CardStyle, points: number[], info: any) {
            let idx = style.key_is_the_min ? 0 : points.length - 1;
            while (0 <= idx && idx < points.length) {
                let p = points[idx];
                if (info.stylecards.numof(p) > 0) {
                    for (let ii = 0; ii < this.__sorted_colors.length; ii++) {
                        let c = this.__sorted_colors[ii];
                        if (info.stylecards.numof(p, c) > 0) {
                            info.keycard.set(p, c)
                            return;
                        }
                    }
                }
                idx += style.key_is_the_min ? 1 : -1;
            }
        }

        /**
         * 根据已有条件，为style创建过滤器
         * @param style 
         * @param filter 
         * @param info 
         */
        _create_filter(style: CardStyle, filter: { points: number[], colors: number[] }, info: any): boolean {
            if (style.each <= 0) return true;
            if (style.point) {
                filter.points.push(<number>style.point);
                if (style.color) {
                    for (let i in style.color) {
                        filter.colors.push(style.color[i])
                    }
                } else {
                    filter.colors.push(PC.ccNull);
                }
                return true;
            }
            if (style.serial) {
                if (style.serial_begin > style.serial_end) {
                    for (let i = style.serial_begin; i < this.__serial_n; i++)
                        filter.points.push(this.__serial_i2p[i])
                    for (let i = 0; i <= style.serial_end; i++)
                        filter.points.push(this.__serial_i2p[i])
                } else if (style.serial_begin == style.serial_end) {
                    for (let i = 0; i < this.__serial_n; i++)
                        filter.points.push(this.__serial_i2p[i])
                    filter.points.push(this.__serial_i2p[0])
                } else {
                    for (let i = style.serial_begin; i <= style.serial_end; i++)
                        filter.points.push(this.__serial_i2p[i])
                }
            } else {
                for (let i in this.__value_v2p) {
                    filter.points.push(this.__value_v2p[i])
                }
            }
            if (style.color) {
                for (let i in style.color) {
                    filter.colors.push(style.color[i])
                }
            }
            if (!style.color && style.samecolor) {
                for (let i = 0; i < this.__sorted_colors.length; i++) {
                    let c = this.__sorted_colors[i]
                    for (let ii = 0; ii < filter.points.length; ii++) {
                        let p = filter.points[ii];
                        if (info.source.numof(p, c) > 0) {
                            filter.colors.push(c); break;
                        }
                    }
                }
            }
            if (!style.samecolor && !style.color) {
                filter.colors.push(PC.ccNull);
            }

            return filter.colors.length > 0;
        }

        /**对points中的点按对应牌数的多少从大到小排序 */
        _sort_points_by_count(source: CardSet, points: number[], color: number): number[] {
            let ret = points.slice(0)
            ret.sort((a, b) => {
                return source.numof(b, color) - source.numof(a, color);
            })
            return ret;
        }
    }
}