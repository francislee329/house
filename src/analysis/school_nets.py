SCHOOL_NETS = {
    "14": {
        "name_zh": "港島東",
        "district": "東區",
        "description": "傳統名校區，多名津貼學校",
        "top_schools": ["寶血小學", "聖馬可小學", "粵華小學"],
    },
    "40": {
        "name_zh": "九龍城",
        "district": "九龍城/深水埗",
        "description": "九龍區核心校網，學校質素穩定",
        "top_schools": ["長沙灣天主教小學", "聖方濟各天主教小學", "陳瑞祺（喇沙）小學"],
    },
    "41": {
        "name_zh": "九龍城",
        "district": "九龍城/九龍塘",
        "description": "「九龍區校網王」，傳統豪宅區，名校集中地",
        "top_schools": ["喇沙小學", "拔萃小學", "瑪利諾修院學校（小學部）", "嘉諾撒聖家學校"],
    },
    "72": {
        "name_zh": "天水圍",
        "district": "元朗區",
        "description": "新界西主要校網，學校數量多",
        "top_schools": ["天水圍官立小學", "寶覺小學", " callbacks"],
    },
    "91": {
        "name_zh": "沙田",
        "district": "沙田區",
        "description": "新界東核心校網，多間 Band 1 學校",
        "top_schools": ["沙田官立小學", "浸信會沙田圍呂明才小學", "陳白沙紀念小學", "聖羅撒學校"],
    },
}

def get_school_net_info(net: str) -> dict:
    return SCHOOL_NETS.get(net, {
        "name_zh": "未知",
        "district": "",
        "description": "資料待更新",
        "top_schools": [],
    })
