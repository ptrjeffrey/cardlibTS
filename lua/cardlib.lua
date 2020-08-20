-- cardlib
-- Author:xigal
-- Date:2019-2-21
local _POINTS = {"A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"}
local _COLORS = {"Spade", "Heart", "Club", "Diamond"}
local _COLORNAMES = {"黑桃", "红心", "梅花", "方块"}
local _XPOINT = {"Xa", "Xb", "Xc"}
local _XNAMES = {"小王", "大王", "X"}
local _MATCHTYPE = {EQ = 1, LE = 2, GE = 3} -- 对应等于、小于等于、大于等于
local _CARDTYPE_PASS = "pass"
local _FILTER_FLAGS = {
    -- 匹配状态
    MATCH_STATUS = 0x0001,
    -- 获取所有
    FIND_ALL = 0x0002
}

-- 点值常量
Poker = {Point = {}, Color = {}, PointValue = {}, ColorValue = {}}
local PP = Poker.Point
local PC = Poker.Color
-- 点值
PP.cpNull = false
PP.cpMin = 1
PP.cpMax = #_POINTS + #_XPOINT
PP.cpMinX = #_POINTS + 1
PP.cpMaxX = #_POINTS + #_XPOINT
for i, v in ipairs(_POINTS) do
    PP["cp" .. v] = i
    Poker.PointValue[string.lower(v)] = i
end
for i, v in ipairs(_XPOINT) do
    PP["cp" .. v] = i + #_POINTS
    Poker.PointValue[string.lower(v)] = i + #_POINTS
end
for i, v in ipairs(_XNAMES) do
    Poker.PointValue[v] = i + #_POINTS
end
-- 花色
PC.ccNull = false
PC.ccMin = 1
PC.ccMax = #_COLORS
for i, v in ipairs(_COLORS) do
    PC["cc" .. v] = i
    Poker.ColorValue[string.lower(string.sub(v, 1, 1))] = i
end
for i, v in ipairs(_COLORNAMES) do
    Poker.ColorValue[v] = i
end

-- 单张牌类
local Card = class("Card")
-- 一手牌
local CardPile = class("CardPile")
-- 牌集合
local CardSet = class("CardSet")
-- 库
local CardLib = class("CardLib")

--------------------------------------------------------------------------------------
-- 检测对象是否为指定类型
function instanceOf(src, cls)
    return type(src) == "table" and src.class == cls
end
-- 查找索引
table.indexOf = function(tbl, v)
    for i, c in ipairs(tbl) do
        if c == v then
            return i
        end
    end
    return nil
end
-- 颠倒数组,注意仅支持数组
table.reverse = function(tbl)
    if #tbl == 0 then
        return tbl
    end
    local ret = {}
    for _, v in ipairs(tbl) do
        table.insert(ret, 1, v)
    end
    return ret
end

--------------------------------------------------------------------------------------
function Card:ctor(...)
    self:set(...)
end

-- 设置卡牌内容
-- 多参数支持 point、color模式
-- 单参数支持card、number、string
function Card:set(...)
    local p, c, s = ...
    local t = type(p)
    if t == "table" then
        self.__point = p.__point or PP.cpNull
        self.__color = p.__color or PC.ccNull
    elseif t == "string" then
        p = string.gsub(string.lower(p), "^%s*(.-)%s*$", "%1")
        self.__point = Poker.PointValue[p]
        if self.__point then
            self.__color = PC.ccMin
        else
            local cc = string.sub(p, 1, 1)
            local pp = string.sub(p, 2)
            local v = Poker.PointValue[pp]
            local c = Poker.ColorValue[cc]
            if v and c then
                self.__color = c
                self.__point = v
            elseif c then
                self.__color = c
                self.__point = PP.cpNull
            elseif #p > 2 then
                self.__color = Poker.ColorValue[string.sub(p, 1, 2)] or PC.ccNull
                self.__point = Poker.PointValue[string.sub(p, 2)] or PP.ccNull
            else
                v = Poker.PointValue[cc]
                if v then
                    self.__color = PC.ccNull
                    self.__point = v
                else
                    self.__color = PC.ccNull
                    self.__point = PP.cpNull
                end
            end
        end
    elseif t == "number" then
        if c == nil then
            if p <= 0 then
                self.__point = PP.cpNull
                self.__color = PC.ccNull
            elseif p <= PP.cpMax then
                self.__color = PC.ccMin
                self.__point = p
            else
                self.__color = math.floor(p / PP.cpMax)
                self.__point = (p % PP.cpMax)
            end
        else
            self.__color = c
            self.__point = p
        end
    else
        self.__status = s or 0
        self.__point = p or PP.cpNull
        self.__color = c or PC.ccNull
    end
end

-- 获取卡牌中文名称
function Card:name()
    return (not self.__point or not self.__color) and "牌背" or (self.__point >= PP.cpMinX and _XNAMES[self.__point - #_POINTS] or (_COLORNAMES[self.__color] .. _POINTS[self.__point]))
end

-- 编码
function Card:code()
    return (not self.__point or not self.__color) and "" or string.lower(self.__point >= PP.cpMinX and _XPOINT[self.__point - #_POINTS] or (string.sub(_COLORS[self.__color], 1, 1) .. _POINTS[self.__point]))
end

-- 值
function Card:value()
    return self:valid() and self.__color * PP.cpMax + self.__point or 0
end

-- 点
function Card:point()
    return self.__point
end
function Card:set_point(v)
    self.__point = v
end

-- 花色
function Card:color()
    return self.__color
end
function Card:set_color(v)
    self.__color = v
end

-- 花色
function Card:status()
    return self.__status
end
function Card:set_status(v)
    self.__status = v
end

-- 返回卡牌是否有效
function Card:valid()
    return self:color_valid() and self:point_valid()
end

function Card:color_valid()
    return self.__color and PC.ccMin <= self.__color and self.__color <= PC.ccMax
end
function Card:point_valid()
    return self.__point and PP.cpMin <= self.__point and self.__point <= PP.cpMax
end

-- 置空
function Card:clear()
    self.__point = PP.ccNull
    self.__color = PC.ccNull
    self.__status = 0
end

Card.expand = function(cards, checkvalid, ret)
    local _addcard = function(list, src)
        local t = type(src)
        if instanceOf(src, Card) then
            local c = Card.new(src)
            if not checkvalid or c:valid() then
                table.insert(list, c)
            end
        elseif instanceOf(src, CardPile) then
            for _, v in ipairs(src.__list) do
                local c = Card.new(v)
                if not checkvalid or c:valid() then
                    table.insert(list, c)
                end
            end
        elseif t == "string" then
            local cs = string.split(src, ",")
            for _, v in ipairs(cs) do
                local c = Card.new(v)
                if not checkvalid or c:valid() then
                    table.insert(list, c)
                end
            end
        elseif t == "table" then
            for _, v in ipairs(src) do
                local c = Card.new(v)
                if not checkvalid or c:valid() then
                    table.insert(list, c)
                end
            end
        else
            local c = Card.new(src)
            if not checkvalid or c:valid() then
                table.insert(list, c)
            end
        end
    end

    ret = ret or {}
    if instanceOf(cards, Card) then
        _addcard(ret, cards)
    elseif type(cards) == "table" then
        for _, v in ipairs(cards) do
            _addcard(ret, v)
        end
    else
        _addcard(ret, cards)
    end
    return ret
end
-----------------------------------------------------------------------------------
-- 牌集合
function CardSet:ctor(pile)
    self.points = {}
    self.count = 0
    for i = PP.cpMin, PP.cpMax do
        local v = {all = 0, one = {}}
        for ii = PC.ccMin, PC.ccMax do
            table.insert(v.one, 0)
        end
        table.insert(self.points, v)
    end
    if pile then
        self:set(pile)
    end
end

function CardSet:set(pile)
    if instanceOf(pile, CardPile) then
        self:clear()
        for _, v in ipairs(pile.__list) do
            self:add(v:point(), v:color())
        end
    elseif instanceOf(pile, CardSet) then
        for i, p in ipairs(pile.points) do
            for ii, c in ipairs(p.one) do
                self.points[i].one[ii] = c
            end
            self.points[i].all = p.all
        end
        self.count = pile.count
    end
end

function CardSet:get(point)
    return self.points[point]
end

function CardSet:clear(point)
    if point then
        local p = self.points[point]
        for ii, c in ipairs(p.one) do
            p.one[ii] = 0
        end
        self.count = self.count - p.all
        p.all = 0
    else
        for i, p in ipairs(self.points) do
            for ii, c in ipairs(p.one) do
                p.one[ii] = 0
            end
            p.all = 0
        end
        self.count = 0
    end
end

function CardSet:add(point, color, n)
    if instanceOf(point, CardSet) then
        for i, p in ipairs(point.points) do
            for ii, c in ipairs(p.one) do
                self.points[i].one[ii] = self.points[i].one[ii] + c
            end
            self.points[i].all = self.points[i].all + p.all
        end
        self.count = self.count + point.count
    elseif point then
        color = not color and PC.ccMin or color
        n = not n and 1 or n
        self.points[point].one[color] = self.points[point].one[color] + n
        self.points[point].all = self.points[point].all + n
        self.count = self.count + n
    end
end

-- 使用card的内容将cp填充到n张，如果最终值超过n，将被截取，否则会被填充
function CardSet:filladd(cp, card, n)
    if not n then
        n = card.all
    end
    local p = self.points[cp]
    local old = p.all
    p.all = p.all + card.all
    for i, c in ipairs(card.one) do
        p.one[i] = p.one[i] + c
    end
    local nall = n + old
    if n > card.all then
        while p.all < nall do
            for cc = PC.ccMax, PC.ccMin, -1 do
                if p.one[cc] > 0 then
                    p.one[cc] = p.one[cc] + 1
                    p.all = p.all + 1
                    break
                elseif cc == PC.ccMin then
                    p.one[cc] = p.one[cc] + 1
                    p.all = p.all + 1
                end
            end
        end
    else
        while p.all > nall do
            for cc = PC.ccMax, PC.ccMin, -1 do
                if p.one[cc] > 0 then
                    p.one[cc] = p.one[cc] - 1
                    p.all = p.all - 1
                    break
                end
            end
        end
    end
    self.count = self.count + p.all - old
end

function CardSet:sub(point, color, n)
    if instanceOf(point, CardSet) then
        self.count = 0
        for i, p in ipairs(self.points) do
            local src = point.points[i]
            src.all = 0
            p.all = 0
            for ii, c in ipairs(p.one) do
                p.one[ii] = p.one[ii] - src.one[ii]
                if p.one[ii] < 0 then
                    p.one[ii] = 0
                end
                p.all = p.all + p.one[ii]
            end
            self.count = self.count + p.all
        end
    elseif not color then
        local p = self.points[point]
        n = not n and 1 or n
        while p.all > 0 and n > 0 do
            for ii, c in ipairs(p.one) do
                if p.one[ii] > 0 then
                    p.one[ii] = p.one[ii] - 1
                    p.all = p.all - 1
                    self.count = self.count - 1
                    n = n - 1
                    if n <= 0 then
                        break
                    end
                end
            end
        end
    else
        n = not n and 1 or n
        local p = self.points[point]
        while n > 0 and p.one[color] > 0 do
            p.one[color] = p.one[color] - 1
            p.all = p.all - 1
            self.count = self.count - 1
            n = n - 1
            if n <= 0 then
                break
            end
        end
    end
end

function CardSet:has(set)
    for i, p in ipairs(self.points) do
        local p2 = set.points[i]
        if p.all < p2.all then
            return false
        end
        for ii, c in ipairs(p2.one) do
            if c < p2.one[ii] then
                return false
            end
        end
    end
    return true
end

function CardSet:numof(point, color)
    if color then
        local p = self.points[point]
        return p.one[color]
    else
        return self.points[point].all
    end
end

function CardSet:pile()
    local pp = CardPile.new()
    for i, p in ipairs(self.points) do
        for ii, c in ipairs(p.one) do
            for iii = 1, c do
                pp:refadd(Card.new(i, ii))
            end
        end
    end
    return pp
end

-----------------------------------------------------------------------------------
-- 牌堆
function CardPile:ctor(...)
    self.__list = {}
    self.__key = Card.new()
    self.__type = nil
    self:add(...)
end

function CardPile:set(...)
    self:clear()
    self:add(...)
end

function CardPile:add(...)
    Card.expand({...}, true, self.__list)
    self.__type = nil
    self.__key:clear()
    return self
end

function CardPile:refadd(...)
    local cards = {...}
    local _addcard = function(list, src)
        local t = type(src)
        if instanceOf(src, Card) then
            table.insert(list, src)
        elseif instanceOf(src, CardPile) then
            for _, v in ipairs(t) do
                if v:valid() then
                    table.insert(list, v)
                end
            end
        elseif t == "string" then
            local cs = string.split(src, ",")
            for _, v in ipairs(cs) do
                local c = Card.new(v)
                if c:valid() then
                    table.insert(list, c)
                end
            end
        elseif t == "table" then
            for _, v in ipairs(src) do
                local c = Card.new(v)
                if c:valid() then
                    table.insert(list, c)
                end
            end
        else
            local c = Card.new(src)
            if c:valid() then
                table.insert(list, c)
            end
        end
    end
    for _, v in ipairs(cards) do
        _addcard(self.__list, v)
    end
    self.__type = nil
    self.__key:clear()
end

function CardPile:fill(n, c, useref)
    c = c or Card.new()
    while n > 0 do
        if useref then
            table.insert(self.__list, c)
        else
            table.insert(self.__list, Card.new(c))
        end
        n = n - 1
    end
    return self
end

-- 检查是否拥有这些牌
function CardPile:has(...)
    local p = CardPile.new(...)
    local ps1 = CardSet.new(p)
    local ps2 = CardSet.new(self)
    return ps2:has(ps1)
end

-- 清理所有牌
function CardPile:clear()
    self.__list = {}
    self.__type = nil
    self.__key:clear()
    return self
end

-- 获取数量
function CardPile:count()
    return #self.__list
end

-- 获取数量
function CardPile:length()
    return #self.__list
end

function CardPile:key()
    return self.__key
end
function CardPile:set_key(k)
    self.__key:set(k)
end
function CardPile:type()
    return self.__type
end
function CardPile:set_type(t)
    self.__type = t
end
-- 获取指定位置的牌
function CardPile:at(index)
    return self.__list[index]
end

-- 删除指定位置的牌
function CardPile:erase(index)
    table.remove(self.__list, index)
    self.__type = nil
    self.__key:clear()
end

-- 删除指定的牌
function CardPile:remove(...)
    local cards = self:filter(...)
    for i = #cards, 1, -1 do
        table.remove(self.__list, cards[i].index)
    end
    self.__type = nil
    self.__key:clear()
    return cards
end

-- 根据指定的牌序列查找对应的
function CardPile:filter(...)
    local cards = {...}
    local n = #cards
    local flags = cards[n]
    if type(flags) == "number" then
        table.remove(cards, n)
    else
        flags = 0
    end
    local m = (flags & _FILTER_FLAGS.MATCH_STATUS) ~= 0
    local a = (flags & _FILTER_FLAGS.FIND_ALL) ~= 0
    local ret = {}
    cards = Card.expand(cards, true)
    for i, v in ipairs(self.__list) do
        for ii, c in ipairs(cards) do
            if c == v or c:point() == v:point() and c:color() == v:color() and (not m or c:status() == v:status()) then
                v.index = i
                table.insert(ret, v)
                if not a then
                    table.remove(cards, ii)
                end
                break
            end
        end
    end
    return ret
end

-- 转换成中文名称
function CardPile:tostring()
    local ret = {}
    for _, c in ipairs(self.__list) do
        table.insert(ret, c:name())
    end
    return table.concat(ret, ",")
end

-- 转换成编码
function CardPile:tocodes()
    local ret = {}
    for _, c in ipairs(self.__list) do
        table.insert(ret, c:code())
    end
    return table.concat(ret, ",")
end

-- 排序
-- lib:牌库
-- type:支持point,color,num三个参数，分别表示按大小、按花色、按数量
-- desc:降序
function CardPile:sort(lib, type, desc)
    local nosort = self:filter(lib:nosort(), _FILTER_FLAGS.FIND_ALL)
    self:remove(nosort)
    if type == "num" then
        local s = CardSet.new(self)
        local lst = {}
        local p
        local iv = 0
        while true do
            p = lib:next_point(p)
            if p == PP.cpNull then
                break
            end
            local a = s:get(p)
            if a.all ~= 0 then
                a.point = p
                a.value = iv
                table.insert(lst, a)
            end
            iv = iv + 1
        end
        if desc then
            table.sort(
                lst,
                function(a, b)
                    local ret = a.all - b.all
                    if ret ~= 0 then
                        return ret > 0
                    else
                        return a.value > b.value
                    end
                end
            )
        else
            table.sort(
                lst,
                function(a, b)
                    local ret = a.all - b.all
                    if ret ~= 0 then
                        return ret < 0
                    else
                        return a.value > b.value
                    end
                end
            )
        end
        self.__list = {}
        for _, p in ipairs(lst) do
            local c
            while true do
                c = lib:next_color(c)
                if c == PC.ccNull then
                    break
                end
                for i = 1, p.one[c] do
                    table.insert(self.__list, Card.new(p.point, c))
                end
            end
        end
    elseif type == "color" then
        table.sort(
            self.__list,
            function(a, b)
                return lib:compare_card(a, b) < 0
            end
        )
        local c
        local cc = {}
        while true do
            c = lib:next_color(c)
            if c == PC.ccNull then
                break
            end
            table.insert(cc, c)
        end
        if desc then
            cc = table.reverse(cc)
        end
        local lst = {}
        for _, c in ipairs(cc) do
            for i = #self.__list, 1, -1 do
                local card = self.__list[i]
                if card:color() == c then
                    table.insert(lst, card)
                    table.remove(self.__list, i)
                end
            end
        end
        self.__list = lst
    elseif type == "point" then
        if desc then
            table.sort(
                self.__list,
                function(a, b)
                    local ret = lib:serial_point_index(a) - lib:serial_point_index(b)
                    if ret ~= 0 then
                        return ret > 0
                    else
                        return a:color() < b:color()
                    end
                end
            )
        else
            table.sort(
                self.__list,
                function(a, b)
                    local ret = lib:serial_point_index(a) - lib:serial_point_index(b)
                    if ret ~= 0 then
                        return ret < 0
                    else
                        return a:color() < b:color()
                    end
                end
            )
        end
    else
        if desc then
            table.sort(
                self.__list,
                function(a, b)
                    local ret = lib:compare_card(a, b)
                    if ret ~= 0 then
                        return ret > 0
                    else
                        return a:color() < b:color()
                    end
                end
            )
        else
            table.sort(
                self.__list,
                function(a, b)
                    local ret = lib:compare_card(a, b)
                    if ret ~= 0 then
                        return ret < 0
                    else
                        return a:color() < b:color()
                    end
                end
            )
        end
    end
    table.sort(
        nosort,
        function(a, b)
            return lib:compare_card(a, b) < 0
        end
    )
    for _, c in ipairs(nosort) do
        table.insert(self.__list, 1, c)
    end
    return self
end

-- 转换成编码
function CardPile:tovalues()
    local ret = {}
    for _, c in ipairs(self.__list) do
        table.insert(ret, c:value())
    end
    return ret
end

---------------------------------------------------------------------------------
function CardLib:ctor()
    --
    self.__types = {}
    self.__sorttypes = {}
    --
    self.__cantbe = CardSet:new()
    --
    self:set_point_value({PP.cp3, PP.cp4, PP.cp5, PP.cp6, PP.cp7, PP.cp8, PP.cp9, PP.cp10, PP.cpJ, PP.cpQ, PP.cpK, PP.cpA, PP.cp2, PP.cpXa, PP.cpXb})
    self:set_color_value({S = 0, C = 0, H = 0, D = 0})
    self:set_serial(_POINTS)
    self:set_baida({}, "xa,xb")
    self:set_nosort("xa,xb")

    self.PC = PC
    self.PP = PP
end

function CardLib:initialize(rule)
    self:add_type({id = 0, name = "不要", code = _CARDTYPE_PASS, value = -1}, false)
    if rule.values then
        self:set_point_value(rule.values.point)
        self:set_color_value(rule.values.color)
    end
    if rule.baida then
        self:set_baida(rule.baida.cards, rule.baida.cantbe)
    end
    self.__sorttypes = {}
    for _, v in ipairs(rule.types) do
        table.insert(self.__sorttypes, self:add_type(v))
    end
    table.sort(
        self.__sorttypes,
        function(a, b)
            return a.value < b.value
        end
    )
    if rule.serials then
        local cards = Card.expand(rule.serials, false)
        local pps = {}
        for _, p in ipairs(cards) do
            table.insert(pps, p:point())
        end
        self:set_serial(pps)
    end
end

-- 根据顺序设置牌点的大小
-- 从小到大排列
function CardLib:set_point_value(...)
    local cards = Card.expand(..., false)
    self.__value_p2v = {}
    self.__value_v2p = {}
    self.__value_min = PP.cpMax
    self.__value_max = PP.cpMin
    for i, c in ipairs(cards) do
        if not c:point_valid() then
            return error("设置点值大小序列中存在无效的点值")
        end
        self.__value_p2v[c:point()] = i
        self.__value_v2p[i] = c:point()
        self.__value_min = math.min(self.__value_min, i)
        self.__value_max = math.max(self.__value_max, i)
    end
end

-- 设置花色大小 {color = value}模式
function CardLib:set_color_value(cc)
    self.__value_c2v = {}
    self.__sorted_colors = {}
    for k, v in pairs(cc) do
        local card = Card.new(k)
        if not card:color_valid() then
            return error("设置花色大小时序列中存在无效的花色")
        end
        self.__value_c2v[card:color()] = v
        table.insert(self.__sorted_colors, card:color())
    end
    table.sort(
        self.__sorted_colors,
        function(a, b)
            local v1 = self.__value_c2v[a]
            local v2 = self.__value_c2v[b]
            return v1 == v2 and a < b or v1 < v2
        end
    )
end

-- 根据顺序排列的点设置哪些可以做顺子
function CardLib:set_serial(ss)
    self.__serial_i2p = {}
    self.__serial_p2i = {}
    self.__serial_n = 0
    ss = Card.expand(ss)
    for i, v in ipairs(ss) do
        if not v:point_valid() then
            return error("设置的连续序列中存在无效的点值")
        end
        self.__serial_i2p[i] = v:point() -- index -> point
        self.__serial_p2i[v:point()] = i -- point -> index
        self.__serial_n = self.__serial_n + 1
    end
end

-- 获取连续点的索引
function CardLib:serial_point_index(point)
    return self.__serial_p2i[point] or nil
end

-- 根据当前点值获取下一个可以连续的点
-- 如果传入nil则返回第一个可以连续的点
function CardLib:next_serial_point(point)
    if not point then
        return self.__serial_p2i[1]
    end
    local idx = self.__serial_p2i[point]
    if not idx then
        return PP.cpNull
    end
    return self.__serial_i2p[idx + 1] or PP.cpNull
end

-- 获取点的值
function CardLib:point_value(point)
    return self.__value_p2v[point] or nil
end

-- 根据当前点获取比自己大的牌的点
-- 如果传入nil则返回最小的点
function CardLib:next_point(point)
    if not point then
        return self.__value_v2p[1]
    end
    local idx = self.__value_p2v[point]
    if not idx then
        return PP.cpNull
    end
    idx = idx + 1
    return idx <= #self.__value_v2p and self.__value_v2p[idx] or PP.cpNull
end

-- 根据当前花色获取比自己大的花色
-- 如果传入nil则返回最小的花色
function CardLib:next_color(color)
    if not color then
        return self.__sorted_colors[1]
    end
    local benext = false
    for _, c in pairs(self.__sorted_colors) do
        if benext then
            return c
        elseif c == color then
            benext = true
        end
    end
    return PC.ccNull
end

-- 返回从p1到p2的长度
function CardLib:length_of_point(p1, p2)
    local i1 = self.__value_p2v[p1]
    local i2 = self.__value_p2v[p2]
    local n = self.__value_max - self.__value_min + 1
    if i1 and i2 then
        return i1 < i2 and (i2 - i1 + 1) or (n - i1 + i2 + 1)
    elseif i1 then
        return n - i1 + 1
    elseif i2 then
        return i2
    else
        return n
    end
end

-- 返回从p1到p2的连续长度
function CardLib:length_of_serial_point(p1, p2)
    local i1 = self.__serial_p2i[p1]
    local i2 = self.__serial_p2i[p2]
    return self:length_of_serial(i1, i2)
end

-- 返回从p1到p2的连续长度
function CardLib:length_of_serial(i1, i2)
    if i1 and i2 then
        return i1 < i2 and (i2 - i1 + 1) or (self.__serial_n - i1 + i2 + 1)
    elseif i1 then
        return self.__serial_n - i1 + 1
    elseif i2 then
        return i2
    else
        return self.__serial_n
    end
end

-- 设置百搭
-- baida:百搭牌，可以被转换成牌的参数
-- cantbe:百搭不能转换成哪些牌，如果为nil，则不改变现有的cantbe设置，需要清零请设置为""
function CardLib:set_baida(baida, cantbe)
    self.__baida = {}
    baida = Card.expand(baida)
    for _, c in ipairs(baida) do
        if c:valid() then
            table.insert(self.__baida, c)
        end
    end
    if cantbe then
        cantbe = Card.expand(cantbe, false)
        self.__cantbe:clear()
        for _, c in ipairs(cantbe) do
            if c:point_valid() or c:color_valid() then
                self.__cantbe:add(c:point(), c:color())
            end
        end
    end
end

-- 设置不排序的牌，这些牌总会被放在最前端，并且按照大小排序
-- cards:可以被转换成牌的参数
function CardLib:set_nosort(cards)
    self.__nosort = Card.expand(cards)
end

function CardLib:nosort()
    return self.__nosort
end

-- 添加牌型
-- 是否重新排序牌型库，默认要排序
function CardLib:add_type(rule, nosort)
    local t = {}
    t.id = rule.id
    t.name = rule.name
    t.code = rule.code
    t.value = rule.value or 0
    t.enabled = rule.enabled or true
    t.mincount = 0
    t.maxcount = 0
    t.styles = {}
    t.each = 0
    t.keystyle = nil
    t.onelength = rule.onelength or false
    local _add_style = function(lib, ss, s)
        local style = {}
        if s.each <= 0 then
            error("样式牌数 count:" .. s.each .. " 必须是大于0的值")
        end
        if s.length <= 0 then
            error("样式长度 length:" .. s.length .. " 必须要是大于0的值")
        end
        style.each = s.each
        style.length = s.length
        style.serial = s.serial or false
        style.point = s.point and Card.new(s.point):point() or nil
        if s.comparelength ~= nil then
            style.comparelength = s.comparelength
        else
            style.comparelength = true
        end
        if s.howgetkey == "max" then
            style.key_is_min_card = false
        else
            style.key_is_min_card = true
        end
        if s.color then
            style.color = {}
            for _, c in ipairs(string.split(s.color, ",")) do
                local cc = Card.new(c)
                if cc:color_valid() then
                    style.color[cc:color()] = true
                end
            end
            style.color = #style.color > 0 and style.color or nil
        else
            style.color = nil
        end
        style.samecolor = s.samecolor or false

        if style.serial then
            style.serial_begin = s.serial_begin and Card.new(s.serial_begin):point() or nil
            style.serial_end = s.serial_end and Card.new(s.serial_end):point() or nil
            style.serial_begin = lib.__serial_p2i[style.serial_begin] or 1
            style.serial_end = lib.__serial_p2i[style.serial_end] or lib:length_of_serial()
        end

        if s.matchtype == "<=" then
            style.matchtype = _MATCHTYPE.LE
        elseif s.matchtype == ">=" then
            style.matchtype = _MATCHTYPE.GE
        else
            style.matchtype = _MATCHTYPE.EQ
        end

        if style.matchtype ~= _MATCHTYPE.LE then
            t.mincount = t.mincount + style.each * style.length
            if style.matchtype == _MATCHTYPE.GE then
                t.maxcount = t.maxcount + style.each * (style.serial and self:length_of_serial(style.serial_begin, style.serial_end) or (PP.cpMax - PP.cpMin))
            else
                t.maxcount = t.maxcount + style.each * style.length
            end
        else
            t.maxcount = style.each * style.length
        end

        table.insert(ss, style)
        return style
    end

    if rule.styles then
        for _, v in ipairs(rule.styles) do
            local s = _add_style(self, t.styles, v)
            t.each = t.each + s.each
            if not t.keystyle then
                t.keystyle = s
                s.ismain = true
            end
        end
    end

    local name = string.lower(t.code)
    if self.__types[name] then
        error("牌型名称:" .. t.code .. " 已经存在")
    end
    self.__types[name] = t
    if t.id ~= nil then
        if self.__types[t.id] then
            error("牌型ID:" .. t.id .. " 已经存在")
        end
        self.__types[t.id] = t
    end
    table.insert(self.__sorttypes, t)
    if nosort then
        table.sort(
            self.__sorttypes,
            function(a, b)
                return a.value < b.value
            end
        )
    end
    return t
end

-- 通过牌型编码查找牌型
function CardLib:find_type(code)
    return self.__types[code] or self.__types[string.lower(code)]
end

-- 比较单张牌的大小
function CardLib:compare_card(c1, c2)
    if c1:color() == c2:color() then
        return self.__value_p2v[c1:point()] - self.__value_p2v[c2:point()]
    else
        local n = self.__value_c2v[c1:color()] - self.__value_c2v[c2:color()]
        if n ~= 0 then
            return n
        end
        return self.__value_p2v[c1:point()] - self.__value_p2v[c2:point()]
    end
end

-- 比较多张牌的大小
-- 不同牌型如果牌值相同，返回-99
function CardLib:compare_cards(cards1, cards2)
    cards1 = instanceOf(cards1, CardPile) and cards1 or CardPile.new(cards1)
    cards2 = instanceOf(cards2, CardPile) and cards2 or CardPile.new(cards2)
    if not cards1.__type then
        self:typeof(cards1, false)
    end
    if not cards2.__type then
        self:typeof(cards2, false)
    end
    if cards1.__type and not cards2.__type then
        return 1
    elseif not cards1.__type and cards2.__type then
        return -1
    else
        local n = cards1.__type.value - cards2.__type.value
        if n ~= 0 then
            return n
        elseif cards1.__type ~= cards2.__type then
            return -99
        elseif cards1.__type.keystyle.comparelength and cards1:count() ~= cards2:count() then
            return -99
        elseif cards1.__type.keystyle.serial then
            return self.__serial_p2i[cards1.__key:point()] - self.__serial_p2i[cards2.__key:point()]
        else
            return self:compare_card(cards1.__key, cards2.__key)
        end
    end
end

-- 测试给定牌的牌型
-- 第二个参数指定是否按小牌型开始检查，默认从大牌型开始(false)
-- return:{pile:实际手牌,out:转换后的牌,type:牌型,filled:填充的牌} or nil
function CardLib:typeof(cards, fromsmall)
    return self:_test_type(cards, nil, PP.cpNull, self.__baida, self.__cantbe, not fromsmall, nil, true)
end

-- 从提供的牌堆里查找指定牌型的牌
-- cards:源牌堆
-- typeorname:牌型或者牌型code
-- count:需要多少张牌
-- fromlarge:从大牌开始，默认值为false
-- fromkey:从这个key开始，不指定将从适合这个牌型的最小key开始(fromsmall时生效)
-- return:{pile:实际手牌,out:转换后的牌,type:牌型,filled:填充的牌} or nil
function CardLib:find_type_cards(cards, typeorname, count, fromlarge, fromkey)
    local type = self:find_type(typeorname.code or typeorname)
    if not type then
        error("指定牌型", typeorname, "无效")
        return nil
    end
    count = count or type.mincount
    local ret = self:_test_type(cards, type, fromkey, self.__baida, self.__cantbe, fromlarge, count, false)
    if not ret then
        return nil
    end
    ret.pile.__type = nil
    ret.pile.__key:clear()
    if ret.filled then
        local pile = ret.out
        local out = CardPile.new(pile)
        pile:remove(ret.filled)
        local baidacards = ret.src:filter(self.__baida, _FILTER_FLAGS.FIND_ALL) or {}
        for i = 1, ret.filled:count() do
            local c = baidacards[1] -- 百搭数量肯定大于填充的数量，所以这里无需检测越界
            pile:refadd(c)
            table.remove(baidacards, 1)
        end
        ret.out = out
        ret.pile = pile
        out:set_type(ret.type)
        out:set_key(ret.key)
        pile:set_type(ret.type)
        pile:set_key(ret.key)
    end
    return ret
end

-- 检测给定的牌是否满足给定的牌型
-- cards:源牌堆
-- type:牌型或者牌型code
-- fromlarge:从大开始，默认值为true
function CardLib:is_cards_match_type(cards, type, fromlarge)
    cards = instanceOf(cards, CardPile) and cards or CardPile.new(cards)
    local ret = self:find_type_cards(cards, type, 0, fromlarge == nil or fromlarge)
    if not ret then
        return false
    end
    if ret.pile:count() == cards:count() then
        cards:set_type(ret.type)
        cards:set_key(ret.key)
        return true
    else
        return false
    end
end

-- 从提供的牌堆里查找比给定牌大的牌
-- cards:源牌堆
-- target:目标手牌
-- return:{pile:实际手牌,out:转换后的牌,type:牌型,filled:填充的牌} or nil
function CardLib:find_great_cards(cards, target)
    local _type = type(target) == "table" and target.__type or nil
    local key = _type and target.__key or nil
    target = instanceOf(target, CardPile) and target or CardPile.new(target)
    if not _type then
        local ret = self:typeof(target)
        if not ret then
            return nil
        end
        _type = ret.type
        key = ret.out.__key:point()
    else
        key = key:point()
    end

    local nextkey
    if _type.keystyle and _type.keystyle.serial then
        nextkey = self:next_serial_point(key)
    else
        nextkey = self:next_point(key)
    end
    if nextkey then
        local ret = _type.value >= 0 and self:find_type_cards(cards, _type, target:count(), false, nextkey) or nil
        if ret then
            return ret
        end
    end
    for _, t in ipairs(self.__sorttypes) do
        if t.value > _type.value and t.enabled then
            local ret = self:find_type_cards(cards, t, nil, false, nil)
            if ret then
                return ret
            end
        end
    end
    return nil
end

function CardLib:deal(count)
    count = count and count or 1
    local ret = {}
    for i = 1, count do
        for c = PC.ccMin, PC.ccMax do
            for p = PP.cpMin, PP.cpK do
                table.insert(ret, Card.new(p, c))
            end
        end
        table.insert(ret, Card.new(PP.cpXa, PC.ccMin))
        table.insert(ret, Card.new(PP.cpXb, PC.ccMin))
    end
    return ret
end

function CardLib:_test_type(cards, thetype, startpoint, baida, cantbe, fromlarge, needcardscount, fullmatch)
    local retf = function(pile, type, typepile, key, filled)
        local out
        local src = pile
        if typepile then
            out = typepile
            out.__key:set(key)
            out.__type = type
        else
            out = pile
        end
        if fullmatch or not typepile then
            pile.__key:set(key)
            pile.__type = type
        else
            pile = out
        end
        return {src = src, pile = pile, type = type, key = key, out = out, filled = filled}
    end
    local pile = cards
    if not instanceOf(pile, CardPile) then
        pile = CardPile.new(pile)
    end
    if pile:count() == 0 then
        return retf(pile, self:find_type(_CARDTYPE_PASS), pile, PP.cpNull, nil)
    end

    local baidacards = baida and pile:filter(baida, _FILTER_FLAGS.FIND_ALL) or {}

    needcardscount = needcardscount and needcardscount or pile:count()
    if #baidacards == pile:count() then
        return self:_test_type(pile, thetype, startpoint, nil, nil, fromlarge, needcardscount, fullmatch)
    end

    local source = CardSet.new(pile)
    local baidamap = {}
    for _, c in ipairs(baidacards) do -- 去除百搭牌先
        source:sub(c:point(), c:color())
        baidamap[c:point()] = true
    end

    local info = {
        source = source,
        filled = CardSet.new(),
        typecards = CardSet.new(),
        keycard = Card.new(),
        baida = baidacards,
        baidamap = baidamap,
        cantbe = cantbe
    }
    local st = thetype and 1 or (not fromlarge and 1 or #self.__sorttypes)
    local ed = thetype and 1 or (not fromlarge and #self.__sorttypes or 1)
    local step = not fromlarge and 1 or -1
    for i = st, ed, step do
        local type = thetype or self.__sorttypes[i]
        if type.enabled then
            local n = self:_get_type_cards(type, startpoint, fromlarge, info, needcardscount)
            if fullmatch and n == pile:count() or n > 0 and not fullmatch and n <= pile:count() then
                return retf(pile, type, info.typecards:pile(), info.keycard, info.filled.count > 0 and info.filled:pile() or nil)
            end
        end
    end
    return nil
end

-- need为需要的牌数量
function CardLib:_get_type_cards(type, startpoint, fromlarge, info, need)
    local neach = type.each
    local needst, needed
    if neach == 0 then
        return 0
    end
    if need > 0 then
        if need < type.mincount or need > type.maxcount then
            return 0
        end
        needst = need
        needed = need
    else
        needst = type.mincount
        needed = type.maxcount
        if needst > info.source.count + #info.baida then
            return 0
        end
    end
    needst = math.floor(needst / neach)
    needed = math.floor(needed / neach)
    if not info.sourcebk then
        info.sourcebk = CardSet.new(info.source)
    else
    end
    if type.keystyle.serial then
        local maxs = type.keystyle.serial_end == type.keystyle.serial_begin and self.__serial_n or type.keystyle.serial_end
        local mins = type.keystyle.serial_end == type.keystyle.serial_begin and 1 or type.keystyle.serial_begin
        local st = startpoint and self.__serial_p2i[startpoint] or (fromlarge and maxs or mins)
        local ed = fromlarge and mins or maxs
        local step = fromlarge and -1 or 1
        for nd = needed, needst, -1 do
            for i = st, ed, step do
                info.keycard:set(self.__serial_i2p[i], PC.ccNull)
                --print("-----------------------------------------------------------------------------")
                if -1 ~= self:_patch_type_cards(type, info.keycard:point(), info, nd) then
                    --print("TCS", info.typecards:pile():tostring(), "F", info.filled:pile():tostring())
                    if info.filled.count <= #info.baida then
                        return info.typecards.count
                    end
                end
                info.source:set(info.sourcebk)
            end
        end
    else
        local st = startpoint and self.__value_p2v[startpoint] or (fromlarge and self.__value_max or self.__value_min)
        local ed = fromlarge and self.__value_min or self.__value_max
        local step = fromlarge and -1 or 1
        for nd = needed, needst, -1 do
            for i = st, ed, step do
                info.keycard:set(self.__value_v2p[i], PC.ccNull)
                --print("-----------------------------------------------------------------------------")
                if -1 ~= self:_patch_type_cards(type, info.keycard:point(), info, nd) then
                    --print("TCS", info.typecards:pile():tostring(), "F", info.filled:pile():tostring())
                    if info.filled.count <= #info.baida then
                        return info.typecards.count
                    end
                end
                info.source:set(info.sourcebk)
            end
        end
    end
    return 0
end

-- 填充这个牌型
function CardLib:_patch_type_cards(type, startpoint, info, need)
    -- 样式的牌型缓存
    info.stylecards = info.stylecards or CardSet.new()
    info.filledtmp = info.filledtmp or CardSet.new()
    info.lastsource = info.lastsource or CardSet.new()
    info.filledtmp:clear()
    info.filled:clear()
    info.typecards:clear()

    local nallfilled = 0
    local nstylefilled = {}
    for _, style in ipairs(type.styles) do
        info.stylecards:clear()
        info.lastsource:set(info.source)
        local stpoint = style.ismain and startpoint or PP.cpNull
        local needn = style.ismain and need or 0
        local nfilled = self:_patch_style_cards(style, stpoint, info, needn)
        if nfilled < 0 then
            return -1
        end

        info.filledtmp:set(info.stylecards)
        info.filledtmp:sub(info.lastsource)
        info.filled:add(info.filledtmp)
        info.typecards:add(info.stylecards)

        nallfilled = nallfilled + nfilled
        table.insert(nstylefilled, math.floor(info.stylecards.count / style.each))
        --print("SCS", info.stylecards:pile():tostring(), "F", info.filled:pile():tostring())
    end

    if type.onelength then
        local nowlen
        for _, l in ipairs(nstylefilled) do
            if not nowlen then
                nowlen = l
            elseif nowlen ~= l then
                return -1
            end
        end
    end
    return nallfilled
end

-- 检查当前长度是否满足样式的需求
function CardLib:_is_length_match_style(style, need, nowlength)
    if style.matchtype == _MATCHTYPE.GE then
        if need > 0 then
            return nowlength >= need and nowlength >= style.length
        else
            return nowlength >= style.length
        end
    elseif style.matchtype == _MATCHTYPE.LE then
        if need > 0 then
            return nowlength <= need and nowlength <= style.length
        else
            return nowlength <= style.length
        end
    else
        if need ~= 0 then 
            return nowlength == need
        else
            return nowlength >= style.length
        end
    end
end

-- 补充指定样式
function CardLib:_patch_style_cards(style, stpoint, info, need)
    local filter = {points = {}, colors = {}}
    if not self:_create_filter(style, filter, info) then
        return 0
    end
    local stidx = stpoint == PP.cpNull and 1 or table.indexOf(filter.points, stpoint)
    if not stidx then
        return -1
    end
    if #info.baida > 0 then
        local nfinallyfilled = -1
        local fianllypoints = {}
        local ccfiled
        for _, cc in ipairs(filter.colors) do
            local nfilled = 0
            local filledpoints = {}
            local st = stidx
            if stpoint ~= PP.cpNull then
                local nexists = info.source:numof(stpoint, cc)
                if nexists < style.each and info.cantbe:numof(stpoint, cc) == 0 then
                    if style.ismain and nexists == 0 and style.length == 1 and not info.baidamap[stpoint] then
                        return -1
                    end
                    nfilled = nfilled + style.each - nexists
                    table.insert(filledpoints, stpoint)
                    st = st + 1
                elseif nexists >= style.each then
                    table.insert(filledpoints, stpoint)
                    st = st + 1
                end
            end
            if not self:_is_length_match_style(style, need, #filledpoints) then
                if style.serial then
                    for i = st, #filter.points do
                        local p = filter.points[i]
                        local nexists = info.source:numof(p, cc)
                        if nexists < style.each then
                            if self:_is_length_match_style(style, need, #filledpoints) then
                                break
                            elseif info.cantbe:numof(p, cc) > 0 then
                                filledpoints = {}
                                nfilled = 0
                            else
                                nfilled = nfilled + style.each - nexists
                                table.insert(filledpoints, p)
                            end
                        else
                            table.insert(filledpoints, p)
                        end
                        if self:_is_length_match_style(style, need, #filledpoints) then
                            break
                        end
                        if nfinallyfilled ~= -1 and nfilled > nfinallyfilled then
                            break
                        end
                    end
                    if #filledpoints > 1 and #filledpoints == #filter.points and filledpoints[#filledpoints] == filledpoints[1] then
                        table.remove(filledpoints, 1)
                    end
                else
                    for i = st, #filter.points do
                        local p = filter.points[i]
                        local nexists = info.source:numof(p, cc)
                        if nexists < style.each then
                            if self:_is_length_match_style(style, need, #filledpoints) then
                                break
                            end
                        else
                            local done = false
                            for ii = 1, math.floor(nexists / style.each) do
                                table.insert(filledpoints, p)
                                if self:_is_length_match_style(style, need, #filledpoints) then
                                    done = true
                                    break
                                end
                            end
                            if done then
                                break
                            end
                        end
                    end
                end
            end
            -- 第二次检查
            if not self:_is_length_match_style(style, need, #filledpoints) then
                if style.serial then
                    local needcheck = false
                    if style.serial_begin == style.serial_end then
                        local minserail = self.__serial_i2p[style.serial_begin]
                        if #filledpoints == #filter.points - 1 and info.source:numof(minserail, cc) >= style.each * 2 then
                            table.insert(filledpoints, minserail)
                            needcheck = true
                        end
                    end

                    if not needcheck or needcheck and not self:_is_length_match_style(style, need, #filledpoints) then
                        if stpoint == PP.cpNull then
                            local j = table.indexOf(filter.points, filledpoints[1]) - 1
                            for i = j, 1, -1 do
                                local p = filter.points[i]
                                if info.cantbe:numof(p, cc) > 0 then
                                    break
                                end
                                table.insert(filledpoints, p)
                                local nexists = info.source:numof(p, cc)
                                if nexists < style.each then
                                    nfilled = nfilled + style.each - nexists
                                end
                                if self:_is_length_match_style(style, need, #filledpoints) then
                                    break
                                end
                            end
                        end
                    end
                elseif not style.ismain or stpoint == PP.cpNull then
                    local points = self:_sort_points_by_count(info.source, filter.points, cc)
                    st = stpoint == PP.cpNull and 1 or table.indexOf(points, stpoint)
                    for i = st, #points do
                        local p = points[i]
                        local nexists = info.source:numof(p, cc)
                        if nexists % style.each ~= 0 and info.cantbe:numof(p, cc) == 0 then
                            table.insert(filledpoints, p)
                            nfilled = nfilled + style.each - nexists
                            if self:_is_length_match_style(style, need, #filledpoints) then
                                break
                            end
                        end
                    end
                    for i = st, #points do
                        local p = points[i]
                        if info.cantbe:numof(p, cc) == 0 then
                            while not self:_is_length_match_style(style, need, #filledpoints) do
                                table.insert(filledpoints, p)
                                nfilled = nfilled + style.each
                            end
                            break
                        end
                    end
                elseif info.cantbe:numof(stpoint, cc) == 0 then
                    local points = self:_sort_points_by_count(info.source, filter.points, cc)
                    st = table.indexOf(points, stpoint)
                    for i = st, #points do
                        local p = points[i]
                        local nexists = info.source:numof(p, cc)
                        if nexists % style.each ~= 0 and info.cantbe:numof(p, cc) == 0 then
                            table.insert(filledpoints, p)
                            nfilled = nfilled + style.each - nexists
                            if self:_is_length_match_style(style, need, #filledpoints) then
                                break
                            end
                        end
                    end
                    for i = st, #points do
                        local p = points[i]
                        if info.cantbe:numof(p, cc) == 0 then
                            while not self:_is_length_match_style(style, need, #filledpoints) do
                                table.insert(filledpoints, p)
                                nfilled = nfilled + style.each
                            end
                            break
                        end
                    end
                end
            end

            if self:_is_length_match_style(style, need, #filledpoints) then
                if nfinallyfilled == -1 or nfilled <= nfinallyfilled then
                    fianllypoints = filledpoints
                    ccfiled = cc
                    nfinallyfilled = nfilled
                end
                if nfinallyfilled == 0 then
                    break
                end
            end
        end

        if self:_is_length_match_style(style, need, #fianllypoints) then
            if ccfiled == PC.ccNull then
                for _, p in ipairs(fianllypoints) do
                    info.stylecards:filladd(p, info.source:get(p), style.each)
                    info.source:sub(p, PC.ccNull, style.each)
                end
            else
                for _, p in ipairs(fianllypoints) do
                    for i = 1, style.each do
                        info.stylecards:add(p, ccfiled)
                        info.source:sub(p, ccfiled)
                    end
                end
            end
            if style.ismain then
                self:_calc_key_card(style, fianllypoints, info)
            end
            return nfinallyfilled
        end
        return -1
    else -- 无百搭的情况
        for _, cc in ipairs(filter.colors) do
            local filledpoints = {}
            local nextcolor = false

            if style.serial then
                for i = stidx, #filter.points do
                    local p = filter.points[i]
                    if info.source:numof(p, cc) < style.each then
                        if self:_is_length_match_style(style, need, #filledpoints) then
                            break
                        elseif cc ~= PC.ccNull and stpoint ~= PP.cpNull then
                            nextcolor = true
                            break
                        else
                            filledpoints = {}
                        end
                    else
                        table.insert(filledpoints, p)
                        if self:_is_length_match_style(style, need, #filledpoints) then
                            break
                        end
                    end
                end
                if #filledpoints > 1 and #filledpoints == #filter.points and filledpoints[1] == filledpoints[#filledpoints] then
                    table.remove(filledpoints, 1)
                end
            else
                for i = stidx, #filter.points do
                    local p = filter.points[i]
                    local n = info.source:numof(p, cc)
                    if n < style.each then
                        if self:_is_length_match_style(style, need, #filledpoints) then
                            break
                        end
                    else
                        local ok = false
                        for k = 1, math.floor(n / style.each) do
                            table.insert(filledpoints, p)
                            if self:_is_length_match_style(style, need, #filledpoints) then
                                ok = true
                                break
                            end
                        end
                        if ok then
                            break
                        end
                    end
                end
            end

            if not nextcolor and self:_is_length_match_style(style, need, #filledpoints) then
                if cc == PC.ccNull then
                    for _, p in ipairs(filledpoints) do
                        info.stylecards:filladd(p, info.source:get(p), style.each)
                        info.source:sub(p, PC.ccNull, style.each)
                    end
                else
                    for _, p in ipairs(filledpoints) do
                        for i = 1, style.each do
                            info.stylecards:add(p, cc)
                            info.source:sub(p, cc)
                        end
                    end
                end
                if style.ismain then
                    self:_calc_key_card(style, filledpoints, info)
                end
                return 0
            end
        end
        return -1
    end
end

-- 获取指定类型的关键牌
function CardLib:_calc_key_card(style, points, info)
    local idx = style.key_is_min_card and 1 or #points
    while 1 <= idx and idx <= #points do
        local p = points[idx]
        if info.stylecards:numof(p) > 0 then
            for _,c in ipairs(self.__sorted_colors) do
                if info.stylecards:numof(p,c) > 0 then
                    info.keycard:set(p,c)
                    return
                end
            end
        end
        idx = style.key_is_min_card and idx+1 or idx-1
    end
end

-- 创建过滤器
function CardLib:_create_filter(style, filter, info)
    if style.each <= 0 then
        return true
    end
    if style.point then
        table.insert(filter.points, style.point)
        if style.color then
            filter.colors = style.color
        else
            table.insert(filter.colors, PC.ccNull)
        end
        return true
    end
    if style.serial then
        if style.serial_begin > style.serial_end then
            for i = style.serial_begin, self.__serial_n do
                table.insert(filter.points, self.__serial_i2p[i])
            end
            for i = 1, style.serial_end do
                table.insert(filter.points, self.__serial_i2p[i])
            end
        elseif style.serial_begin == style.serial_end then
            for i = 1, self.__serial_n do
                table.insert(filter.points, self.__serial_i2p[i])
            end
            table.insert(filter.points, self.__serial_i2p[1])
        else
            for i = style.serial_begin, style.serial_end do
                table.insert(filter.points, self.__serial_i2p[i])
            end
        end
    else
        for _, p in ipairs(self.__value_v2p) do
            table.insert(filter.points, p)
        end
    end

    if style.color then
        filter.colors = style.color
    end

    if not style.color and style.samecolor then
        for _, c in ipairs(self.__sorted_colors) do
            for _, p in ipairs(filter.points) do
                if info.source:numof(p, c) > 0 then
                    table.insert(filter.colors, c)
                    break
                end
            end
        end
    end

    if not style.samecolor and not style.color then
        table.insert(filter.colors, PC.ccNull)
    end

    return #filter.colors > 0
end

function CardLib:_sort_points_by_count(source, points, color)
    local ret = {}
    for _, v in ipairs(points) do
        table.insert(ret, v)
    end
    table.sort(
        ret,
        function(a, b)
            return source:numof(a, color) > source:numof(b, color)
        end
    )
    return ret
end

---------------------------------------------------------------------------------
function CardLib:card(...)
    return Card.new(...)
end

function CardLib:cardlist(...)
    return CardPile.new(...)
end

function CardLib:cardset(...)
    return CardSet.new(...)
end

cardlib = {
    initialize = function(rule)
        local lib = CardLib.new()
        lib:initialize(rule)
        return lib
    end,
    -- 过滤器参数
    FILTER_FLAGS = _FILTER_FLAGS,
    PC = PC,
    PP = PP
}
