// 한라산 페이지 "오름" 탭 데이터 — 20곳
//
// 출처와 검증 내역: directives/proposals/oreum_candidates.md (4~7절, 2026-11-11 검증)
// - name.zh: 비짓제주 공식 중문명 (깨진 표기는 권장값, 5절 참고)
// - lat/lng: 카카오맵 주차장·입구 좌표
// - heightM: 제주도 「제주오름요약설명」, 없는 곳은 일반 인용값(미검증)
// - bus: 제주 BIS 현재 경유 노선 + 도청 정류장 외국어 표기(표지판과 같은 이름). walkMin은 직선거리 기반 추정
// - taxi: [분, 원] 카카오모빌리티 예상요금 (jeju=제주시청, jungmun=중문관광단지 출발)
// - time: 왕복 분 [최소, 최대] — 공식 출처 없음, 추정치
// flags: summit_closed 정상부 출입제한 / fee 유료 / ferry 배 필요 / taxi_only 버스 없음 /
//        taxi_recommended 정류장 멂 / private 사유지 / no_camping 취사·야영 금지 / steep 경사 급함 / stairs 계단 많음
// 통제 현황은 바뀔 수 있으므로 분기마다 제주도 공고를 다시 확인할 것.

export const OREUMS = [
    {
        "id": "dodubong",
        "name": {
            "zh": "道头峰",
            "en": "Dodubong Peak",
            "ko": "도두봉"
        },
        "region": "north",
        "lat": 33.50858,
        "lng": 126.47031,
        "heightM": 64,
        "time": [
            20,
            30
        ],
        "level": "easy",
        "seasons": [
            "spring",
            "all"
        ],
        "light": "both",
        "flags": [],
        "photo": {
            "zh": "山顶山茶花树洞框住大海的“Kisses拍照点”，还能看飞机起降",
            "en": "The \"Kisses\" camellia tunnel framing the sea, plus planes landing at the airport",
            "ko": "동백나무 터널이 바다를 감싸는 키세스존, 공항 이착륙 비행기"
        },
        "bus": {
            "stop": {
                "zh": "道头峰",
                "en": "Dodubong East",
                "ko": "도두봉 동쪽"
            },
            "routes": [
                "1111",
                "1112",
                "1113",
                "444",
                "445",
                "447",
                "453",
                "454"
            ],
            "walkMin": 4
        },
        "taxi": {
            "jeju": [
                20,
                10000
            ],
            "jungmun": [
                42,
                37000
            ]
        }
    },
    {
        "id": "sarabong",
        "name": {
            "zh": "沙罗峰",
            "en": "Sarabong Peak",
            "ko": "사라봉"
        },
        "region": "north",
        "lat": 33.51866,
        "lng": 126.54747,
        "heightM": 148,
        "time": [
            30,
            40
        ],
        "level": "easy",
        "seasons": [
            "spring",
            "all"
        ],
        "light": "sunset",
        "flags": [],
        "photo": {
            "zh": "从山顶亭子远眺济州港，日落时整片天空染红",
            "en": "Sunset over Jeju Port from the hilltop pavilion",
            "ko": "정상 정자에서 바라보는 제주항 노을"
        },
        "bus": {
            "stop": {
                "zh": "第六码头",
                "en": "Pier 6",
                "ko": "제6부두"
            },
            "routes": [
                "315",
                "411",
                "412",
                "415",
                "425",
                "426"
            ],
            "walkMin": 9
        },
        "taxi": {
            "jeju": [
                8,
                6000
            ],
            "jungmun": [
                52,
                42000
            ]
        }
    },
    {
        "id": "byeoldobong",
        "name": {
            "zh": "别刀峰",
            "en": "Byeoldobong Peak",
            "ko": "별도봉"
        },
        "region": "north",
        "lat": 33.5192,
        "lng": 126.55309,
        "heightM": 136,
        "time": [
            30,
            40
        ],
        "level": "easy",
        "seasons": [
            "spring",
            "all"
        ],
        "light": "sunrise",
        "flags": [],
        "photo": {
            "zh": "沿海崖步道俯瞰蔚蓝大海与济州港，可与沙罗峰连走",
            "en": "Clifftop seaside path over Jeju Port, easy to combine with Sarabong",
            "ko": "해안 절벽 산책로와 제주항 전경, 사라봉과 이어 걷기"
        },
        "bus": {
            "stop": {
                "zh": "五贤中学・高校",
                "en": "Ohyun Middle & High School",
                "ko": "오현중고등학교"
            },
            "routes": [
                "101",
                "201",
                "300",
                "3002",
                "3006",
                "3007",
                "301",
                "311"
            ],
            "walkMin": 11
        },
        "taxi": {
            "jeju": [
                11,
                7000
            ],
            "jungmun": [
                56,
                44000
            ]
        }
    },
    {
        "id": "seoubong",
        "name": {
            "zh": "犀牛峰",
            "en": "Seoubong Peak",
            "ko": "서우봉"
        },
        "region": "east",
        "lat": 33.54274,
        "lng": 126.66039,
        "heightM": 111,
        "time": [
            30,
            50
        ],
        "level": "easy",
        "seasons": [
            "spring",
            "autumn"
        ],
        "light": "both",
        "flags": [],
        "photo": {
            "zh": "春天油菜花、秋天波斯菊，背后是咸德海滩的翡翠色海水",
            "en": "Canola (spring) or cosmos (autumn) above the emerald water of Hamdeok Beach",
            "ko": "유채·코스모스 너머 함덕해변 에메랄드 바다"
        },
        "bus": {
            "stop": {
                "zh": "咸德碑石街",
                "en": "Hamdeok Biseokgeori",
                "ko": "함덕비석거리"
            },
            "routes": [
                "201",
                "311",
                "311-1",
                "312",
                "312-1",
                "325",
                "326-1",
                "341"
            ],
            "walkMin": 2
        },
        "taxi": {
            "jeju": [
                24,
                15000
            ],
            "jungmun": [
                59,
                56000
            ]
        }
    },
    {
        "id": "jimibong",
        "name": {
            "zh": "地尾峰",
            "en": "Jimibong Peak",
            "ko": "지미봉"
        },
        "region": "east",
        "lat": 33.49671,
        "lng": 126.90605,
        "heightM": 166,
        "time": [
            40,
            50
        ],
        "level": "moderate",
        "seasons": [
            "autumn",
            "all"
        ],
        "light": "sunrise",
        "flags": [
            "steep"
        ],
        "photo": {
            "zh": "山顶一眼望尽城山日出峰、牛岛和彩色石墙田",
            "en": "Seongsan Ilchulbong, Udo and patchwork stone-wall fields in one view",
            "ko": "성산일출봉·우도·종달리 밭담을 한눈에"
        },
        "bus": {
            "stop": {
                "zh": "地尾峰入口",
                "en": "Jimibong Entrance",
                "ko": "지미봉입구"
            },
            "routes": [
                "711-2"
            ],
            "walkMin": 5
        },
        "taxi": {
            "jeju": [
                55,
                40000
            ],
            "jungmun": [
                85,
                67000
            ]
        }
    },
    {
        "id": "yongnuni",
        "name": {
            "zh": "龙眼岳",
            "en": "Yongnuni Oreum",
            "ko": "용눈이오름"
        },
        "region": "east",
        "lat": 33.46307,
        "lng": 126.83161,
        "heightM": 248,
        "time": [
            40,
            50
        ],
        "level": "easy",
        "seasons": [
            "autumn",
            "spring"
        ],
        "light": "both",
        "flags": [],
        "photo": {
            "zh": "三个火山口连成柔和曲线，草原上放牧的牛群",
            "en": "Soft ridgelines of three craters with grazing cattle",
            "ko": "세 굼부리가 만든 부드러운 능선과 방목 소"
        },
        "bus": {
            "stop": {
                "zh": "龙卧岳",
                "en": "Yongnuni Oreum",
                "ko": "용눈이오름"
            },
            "routes": [
                "810-1",
                "810-2"
            ],
            "walkMin": 1
        },
        "taxi": {
            "jeju": [
                45,
                33000
            ],
            "jungmun": [
                79,
                63000
            ]
        }
    },
    {
        "id": "baekyaki",
        "name": {
            "zh": "百药岳",
            "en": "Baekyaki Oreum",
            "ko": "백약이오름"
        },
        "region": "east",
        "lat": 33.44112,
        "lng": 126.79427,
        "heightM": 357,
        "time": [
            30,
            40
        ],
        "level": "easy",
        "seasons": [
            "autumn",
            "all"
        ],
        "light": "sunrise",
        "flags": [
            "summit_closed"
        ],
        "photo": {
            "zh": "从草原笔直通向天空的木台阶——“天国阶梯”",
            "en": "The long wooden \"Stairway to Heaven\" rising straight from the meadow",
            "ko": "초원에서 하늘로 이어지는 천국의 계단"
        },
        "bus": {
            "stop": {
                "zh": "百药岳",
                "en": "Baekyaki Oreum",
                "ko": "백약이오름"
            },
            "routes": [
                "211",
                "212",
                "721-2"
            ],
            "walkMin": 1
        },
        "taxi": {
            "jeju": [
                36,
                28000
            ],
            "jungmun": [
                70,
                57000
            ]
        }
    },
    {
        "id": "udobong",
        "name": {
            "zh": "牛岛峰",
            "en": "Udobong Peak",
            "ko": "우도봉"
        },
        "region": "east",
        "lat": 33.5,
        "lng": 126.96742,
        "heightM": 132,
        "time": [
            40,
            60
        ],
        "level": "easy",
        "seasons": [
            "spring",
            "summer"
        ],
        "light": "both",
        "flags": [
            "ferry"
        ],
        "photo": {
            "zh": "草坡上的小马、脚下的海崖和对岸的城山日出峰",
            "en": "Ponies on grassy slopes above sea cliffs, facing Seongsan Ilchulbong",
            "ko": "초원 위 조랑말과 해안절벽, 성산일출봉 조망"
        }
    },
    {
        "id": "saebyeol",
        "name": {
            "zh": "晓星岳",
            "en": "Saebyeol Oreum",
            "ko": "새별오름"
        },
        "region": "west",
        "lat": 33.36514,
        "lng": 126.36108,
        "heightM": 519,
        "time": [
            40,
            50
        ],
        "level": "moderate",
        "seasons": [
            "autumn"
        ],
        "light": "sunset",
        "flags": [
            "steep",
            "no_camping"
        ],
        "photo": {
            "zh": "秋天整座山被银色芒草覆盖，山顶看地平线日落",
            "en": "The whole hill turns silver with grass in autumn; horizon sunset from the top",
            "ko": "가을 은빛 억새와 정상의 지평선 일몰"
        },
        "bus": {
            "stop": {
                "zh": "新星岳",
                "en": "Saebyeol Oreum",
                "ko": "새별오름"
            },
            "routes": [
                "251",
                "252",
                "253",
                "254",
                "255",
                "282",
                "901"
            ],
            "walkMin": 11
        },
        "taxi": {
            "jeju": [
                33,
                24000
            ],
            "jungmun": [
                20,
                18000
            ]
        }
    },
    {
        "id": "geum",
        "name": {
            "zh": "今岳",
            "en": "Geum Oreum (Geumak Oreum)",
            "ko": "금오름"
        },
        "region": "west",
        "lat": 33.35105,
        "lng": 126.30573,
        "heightM": 428,
        "time": [
            40,
            50
        ],
        "level": "easy",
        "seasons": [
            "autumn",
            "all"
        ],
        "light": "sunset",
        "flags": [],
        "photo": {
            "zh": "圆形火山口里的小水潭倒映天空和晚霞",
            "en": "A round crater with a pond reflecting the sky at sunset",
            "ko": "원형 분화구 물웅덩이에 비친 하늘과 노을"
        },
        "bus": {
            "stop": {
                "zh": "Geum Oreum",
                "en": "Geum Oreum",
                "ko": "금오름"
            },
            "routes": [
                "783-1"
            ],
            "walkMin": 3
        },
        "taxi": {
            "jeju": [
                41,
                32000
            ],
            "jungmun": [
                23,
                18000
            ]
        }
    },
    {
        "id": "songaksan",
        "name": {
            "zh": "松岳山",
            "en": "Songaksan Mountain",
            "ko": "송악산"
        },
        "region": "west",
        "lat": 33.20627,
        "lng": 126.28974,
        "heightM": 104,
        "time": [
            60,
            80
        ],
        "level": "easy",
        "seasons": [
            "spring",
            "all"
        ],
        "light": "sunset",
        "flags": [
            "summit_closed"
        ],
        "photo": {
            "zh": "海边栈道上，兄弟岛、山房山和大海同框",
            "en": "Brothers Islands, Sanbangsan and the sea in one frame from the cliff boardwalk",
            "ko": "둘레길 데크에서 형제섬·산방산·바다를 한 프레임에"
        },
        "bus": {
            "stop": {
                "zh": "山伊水洞",
                "en": "Sanisu-dong",
                "ko": "산이수동"
            },
            "routes": [
                "752-1",
                "752-2"
            ],
            "walkMin": 4
        },
        "taxi": {
            "jeju": [
                55,
                45000
            ],
            "jungmun": [
                32,
                20000
            ]
        }
    },
    {
        "id": "suwolbong",
        "name": {
            "zh": "水月峰",
            "en": "Suwolbong Peak",
            "ko": "수월봉"
        },
        "region": "west",
        "lat": 33.29529,
        "lng": 126.16402,
        "heightM": 77,
        "time": [
            20,
            30
        ],
        "level": "easy",
        "seasons": [
            "autumn",
            "all"
        ],
        "light": "sunset",
        "flags": [],
        "photo": {
            "zh": "遮归岛方向的海上日落，还有火山灰层层堆积的海崖",
            "en": "Sunset behind Chagwido and cliffs of layered volcanic ash",
            "ko": "차귀도 너머 일몰과 화산재 지층 절벽"
        },
        "bus": {
            "stop": {
                "zh": "汉场洞",
                "en": "Hanjang-dong",
                "ko": "한장동"
            },
            "routes": [
                "761-1",
                "761-2"
            ],
            "walkMin": 12
        },
        "taxi": {
            "jeju": [
                71,
                52000
            ],
            "jungmun": [
                45,
                30000
            ]
        }
    },
    {
        "id": "mundoji",
        "name": {
            "zh": "文道之岳",
            "en": "Mundoji Oreum",
            "ko": "문도지오름"
        },
        "region": "west",
        "lat": 33.32828,
        "lng": 126.29604,
        "heightM": 260,
        "time": [
            20,
            30
        ],
        "level": "easy",
        "seasons": [
            "autumn",
            "all"
        ],
        "light": "sunset",
        "flags": [
            "taxi_only",
            "private"
        ],
        "photo": {
            "zh": "开阔草原上自由吃草的马群，山脊上的日落剪影",
            "en": "Horses grazing freely on open grassland, sunset silhouettes on the ridge",
            "ko": "초원 위 방목 말과 능선 일몰 실루엣"
        },
        "taxi": {
            "jeju": [
                60,
                39000
            ],
            "jungmun": [
                40,
                26000
            ]
        }
    },
    {
        "id": "gogeunsan",
        "name": {
            "zh": "高根山",
            "en": "Gogeunsan Mountain",
            "ko": "고근산"
        },
        "region": "south",
        "lat": 33.26377,
        "lng": 126.51111,
        "heightM": 396,
        "time": [
            40,
            50
        ],
        "level": "moderate",
        "seasons": [
            "autumn",
            "winter"
        ],
        "light": "both",
        "flags": [],
        "photo": {
            "zh": "俯瞰西归浦新市区，以及海上的虎岛、蚊岛",
            "en": "Seogwipo city below with Beomseom and Munseom islands offshore",
            "ko": "서귀포 신시가지와 범섬·문섬이 떠 있는 바다"
        },
        "bus": {
            "stop": {
                "zh": "新市街地",
                "en": "New Town",
                "ko": "신시가지"
            },
            "routes": [
                "641",
                "642",
                "643",
                "644",
                "655",
                "691",
                "692"
            ],
            "walkMin": 7
        },
        "taxi": {
            "jeju": [
                57,
                48000
            ],
            "jungmun": [
                20,
                13000
            ]
        }
    },
    {
        "id": "gunsan",
        "name": {
            "zh": "军山岳",
            "en": "Gunsan Oreum",
            "ko": "군산오름"
        },
        "region": "south",
        "lat": 33.25287,
        "lng": 126.36854,
        "heightM": 334,
        "time": [
            20,
            30
        ],
        "level": "easy",
        "seasons": [
            "autumn",
            "all"
        ],
        "light": "both",
        "flags": [
            "taxi_recommended"
        ],
        "photo": {
            "zh": "山顶360度全景：山房山、兄弟岛、松岳山和汉拿山",
            "en": "360° panorama of Sanbangsan, Brothers Islands, Songaksan and Hallasan",
            "ko": "산방산·형제섬·송악산·한라산 360도 파노라마"
        },
        "bus": {
            "stop": {
                "zh": "大田入口",
                "en": "Hanbat Entrance",
                "ko": "한밭입구"
            },
            "routes": [
                "751-2"
            ],
            "walkMin": 18
        },
        "taxi": {
            "jeju": [
                53,
                40000
            ],
            "jungmun": [
                20,
                12000
            ]
        }
    },
    {
        "id": "jejigi",
        "name": {
            "zh": "寺岳",
            "en": "Jejigi Oreum",
            "ko": "제지기오름"
        },
        "region": "south",
        "lat": 33.241,
        "lng": 126.6108,
        "heightM": 95,
        "time": [
            30,
            40
        ],
        "level": "easy",
        "seasons": [
            "winter",
            "spring"
        ],
        "light": "both",
        "flags": [],
        "photo": {
            "zh": "近在眼前的甫木浦口和森岛，冬天有山茶花",
            "en": "Bomok Harbor and Seopseom island right below; camellias in winter",
            "ko": "손에 잡힐 듯한 보목포구와 섶섬, 겨울 동백"
        },
        "bus": {
            "stop": {
                "zh": "甫木浦口",
                "en": "Bomok Harbor",
                "ko": "보목포구"
            },
            "routes": [
                "630",
                "680"
            ],
            "walkMin": 5
        },
        "taxi": {
            "jeju": [
                64,
                49000
            ],
            "jungmun": [
                37,
                22000
            ]
        }
    },
    {
        "id": "mulyeongari",
        "name": {
            "zh": "水灵岳",
            "en": "Mulyeongari Oreum",
            "ko": "물영아리오름"
        },
        "region": "south",
        "lat": 33.32758,
        "lng": 126.71674,
        "heightM": 508,
        "time": [
            60,
            80
        ],
        "level": "moderate",
        "seasons": [
            "summer"
        ],
        "light": null,
        "flags": [
            "stairs",
            "no_camping"
        ],
        "photo": {
            "zh": "雾天里如梦似幻的山顶湿地（拉姆萨尔湿地）和杉树林",
            "en": "A misty crater wetland (Ramsar site) and cedar forest",
            "ko": "안개 낀 산정 습지(람사르)와 삼나무 숲"
        },
        "bus": {
            "stop": {
                "zh": "东冈",
                "en": "Dongmoru",
                "ko": "동모루"
            },
            "routes": [
                "295",
                "295-1",
                "742-1",
                "742-2",
                "744"
            ],
            "walkMin": 1
        },
        "taxi": {
            "jeju": [
                40,
                31000
            ],
            "jungmun": [
                48,
                35000
            ]
        }
    },
    {
        "id": "sangumburi",
        "name": {
            "zh": "山君不离",
            "en": "Sangumburi Crater",
            "ko": "산굼부리"
        },
        "region": "mid",
        "lat": 33.43257,
        "lng": 126.69383,
        "heightM": 438,
        "time": [
            30,
            50
        ],
        "level": "easy",
        "seasons": [
            "autumn"
        ],
        "light": "sunset",
        "flags": [
            "fee"
        ],
        "photo": {
            "zh": "一望无际的银色芒草海和“山君不离”标志拍照点",
            "en": "An endless sea of silver grass and the famous Sangumburi sign",
            "ko": "끝없는 억새밭과 산굼부리 포토존"
        },
        "bus": {
            "stop": {
                "zh": "山君不离",
                "en": "Sangumburi",
                "ko": "산굼부리"
            },
            "routes": [
                "212",
                "222-1"
            ],
            "walkMin": 10
        },
        "taxi": {
            "jeju": [
                29,
                20000
            ],
            "jungmun": [
                60,
                45000
            ]
        }
    },
    {
        "id": "ttarabi",
        "name": {
            "zh": "多罗非丘",
            "en": "Ttarabi Oreum",
            "ko": "따라비오름"
        },
        "region": "mid",
        "lat": 33.38435,
        "lng": 126.75798,
        "heightM": 342,
        "time": [
            50,
            60
        ],
        "level": "moderate",
        "seasons": [
            "autumn"
        ],
        "light": "sunset",
        "flags": [
            "taxi_only"
        ],
        "photo": {
            "zh": "三个火山口相连的山脊上，芒草随风翻起银色波浪",
            "en": "Silver grass rolling like waves along three linked crater ridges",
            "ko": "세 분화구 능선 위로 일렁이는 억새 물결"
        },
        "taxi": {
            "jeju": [
                51,
                34000
            ],
            "jungmun": [
                59,
                41000
            ]
        }
    },
    {
        "id": "bulgeun",
        "name": {
            "zh": "赤岳",
            "en": "Bulgeun Oreum",
            "ko": "붉은오름"
        },
        "region": "mid",
        "lat": 33.40149,
        "lng": 126.67536,
        "heightM": 569,
        "time": [
            50,
            70
        ],
        "level": "easy",
        "seasons": [
            "all",
            "winter"
        ],
        "light": null,
        "flags": [
            "fee"
        ],
        "photo": {
            "zh": "笔直高大的杉树林栈道和铺满红色火山石的林间小路",
            "en": "Boardwalks through tall cedars and paths of red volcanic scoria",
            "ko": "삼나무 숲 데크길과 붉은 화산송이 산책로"
        },
        "bus": {
            "stop": {
                "zh": "赤岳修养林入口",
                "en": "Beulgeun Oreum Natural Recreation Forest Entrance",
                "ko": "붉은오름 휴양림입구"
            },
            "routes": [
                "231",
                "232"
            ],
            "walkMin": 13
        },
        "taxi": {
            "jeju": [
                31,
                22000
            ],
            "jungmun": [
                54,
                40000
            ]
        }
    }
];
