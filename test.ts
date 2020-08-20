import { cardlib } from './cardlib'

let rule: any = {
    types: [
        {
            name: '单张',
            code: 'one',
            value: 0,
            enabled: true,
            styles: [
                {
                    each: 1,
                    length: 1,
                }
            ]
        },
        {
            name: '对子',
            code: 'two',
            value: 0,
            enabled: true,
            styles: [
                {
                    each: 2,
                    length: 1,
                }
            ]
        },
        {
            name: '炸弹4',
            code: 'bomb4',
            value: 1,
            enabled: true,
            styles: [
                {
                    each: 4,
                    length: 1,
                }
            ]
        },
        {
            name: '炸弹5',
            code: 'bomb5',
            value: 2,
            enabled: true,
            styles: [
                {
                    each: 5,
                    length: 1,
                }
            ]
        },
        {
            name: '王炸',
            code: 'godbomb',
            value: 99,
            enabled: true,
            styles: [
                {
                    each: 2,
                    point: 'xa',
                    length: 1,
                },
                {
                    each: 2,
                    point: 'xb',
                    length: 1,
                }
            ]
        },
        {
            name: '顺子',
            code: 'ss',
            value: 0,
            enabled: true,
            styles: [
                {
                    each: 1,
                    length: 5,
                    serial: true,
                    matchtype: '>:',
                }
            ]
        },
        {
            name: '同花顺',
            code: 'ssss',
            value: 88,
            enabled: true,
            styles: [
                {
                    each: 1,
                    length: 5,
                    serial: true,
                    samecolor: true,
                    matchtype: '>:',
                }
            ]
        },
        {
            name: '三带二',
            code: 'three2',
            value: 0,
            enabled: true,
            styles: [
                {
                    each: 3,
                    length: 1,
                },
                {
                    each: 2,
                    length: 1,
                }
            ]
        },
        {
            name: '四带二',
            code: 'four2',
            value: 0,
            enabled: true,
            styles: [
                {
                    each: 4,
                    length: 1,
                },
                {
                    each: 1,
                    length: 1,
                },
                {
                    each: 1,
                    length: 1,
                }
            ]
        },
        {
            name: '飞机带翅膀',
            code: 'plane',
            value: 0,
            enabled: true,
            onelength: true,
            styles: [
                {
                    each: 3,
                    length: 2,
                    serial: true,
                    matchtype: '>=',
                },
                {
                    each: 1,
                    length: 1,
                    //matchtype:'>=',
                },
            ]
        }
    ]
};

rule.baida = {
    cards: 'h2',
    cantbe: 'xa,xb',
};

let lib = new cardlib.CardLib();
lib.initialize(rule);

let print_type = (cards: any) => {
    let t = lib.typeof(cards)
    if (t) {
        console.log(cards.tostring(), ' 牌型：', t.type.name, ' 表象牌：', t.out.tostring(), ' 实际牌：', t.pile.tostring())
    } else {
        console.log(cards.tostring(), ' 牌型：无牌型')
    }
}

let _set_maincard = function (maincard: cardlib.Card) {
    let pps = [];
    let PP = cardlib.PP;
    for (let i = PP.cp2; i <= PP.cpK; i++) {
        if (i != maincard.point) {
            pps.push(i);
        }
    }
    if (PP.cpA != maincard.point)
        pps.push(PP.cpA);
    pps.push(maincard.point);
    pps.push(PP.cpXa);
    pps.push(PP.cpXb);
    lib.set_point_value(pps);
    lib.set_baida(maincard, 'xa,xb');
}

let xx = new cardlib.CardPile();
// xx.set('s7,d7,s10,s2,h2,d10,d8,h2,sj,dj,xa,xb')
// console.log('排序', xx.sort(lib, 'color').tostring())
// console.log('--------------------不要---------------------');
// print_type(xx);

_set_maincard(new cardlib.Card('h2'));
xx.set('s10,c10,d10,hj,sj,dj,s7,d7');
print_type(xx);

console.log('--------------------对子---------------------');
xx.set('da,h2')
print_type(xx);

console.log('--------------------顺子---------------------');
xx.set('s7,d8,s10,h2,h2')
print_type(xx);

console.log('--------------------同花顺---------------------');
xx.set('d7,d8,d10,h2,h2')
print_type(xx);

console.log('--------------------三带二---------------------');
xx.set('s7,d7,s10,h2,h2')
print_type(xx);

console.log('--------------------飞机---------------------');
xx.set('s7,d7,s10,h2,h2,d10,d8,h2,sj,dj')
print_type(xx);

console.log('--------------------王炸---------------------');
xx.set('xa,xa,xb,xb')
print_type(xx);

console.log('--------------------找手牌看看---------------------');
xx.set('s7,d7,s10,h2,h2,d10,d8,h2,sj,dj')
let p = lib.find_type_cards(xx, 'bomb4')
if (p) {
    console.log(xx.tostring(), ' 牌型：', p.type.name, ' 表现牌：', p.out.tostring(), ' 实际牌：', p.pile.tostring())
} else {
    console.log(xx.tostring(), ' 牌型：无牌型')
}

console.log('--------------------找个大牌看看---------------------');
xx.set('h2,h2')
p = lib.find_great_cards(xx, 'h2,h2')
if (p) {
    console.log(xx.tostring(), ' 牌型：', p.type.name, ' 表现牌：', p.out.tostring(), ' 实际牌：', p.pile.tostring())
} else {
    console.log(xx.tostring(), ' 牌型：无牌型')
}


console.log('比较大小', lib.compare_cards('s3,d4,d5,d7,h6', 's4,s5,s6,s7,d8'))

p = new cardlib.CardPile()
let d = lib.deal(1)
for (let i = 0; i < d.length; i++) {
    let c = d[i]
    p.add(new cardlib.Card(c.value))
    console.log(c.name, c.value)
}
console.log(p.count, d.length, p.tostring())

p = new cardlib.Card(cardlib.PP.cpXb)
console.log(p.value)