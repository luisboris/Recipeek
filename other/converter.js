function convertValues(unit1, value, unit2) {    // convert unit1 into unit2

    let keys = [ ["cup"], ["tbsp", "tablespoon"], ["tsp", "teaspoon"], ["l"], ["ml"], ["quart"], ["pint"] ] // a, b
    
    chart = [           //  CUP-0       TBSP-1      TSP-2   L-3     ML-4    QUART-5     PINT-6      //  yy's
/*  xx's  0-CUP    */   [   1,          16,         48,     0.24,   240,    0.25,       0.5,        ],
/*        1-TBSP   */   [   (1/16),     1,          3,      0.015,  15,     0.015,      0.03        ],
/*        2-TSP    */   [   (1/48),     (1/3),      1,      0.005,  5,      0.005,      0.01        ],
/*        3-L      */   [   (1/0.24),   (100/3),    200,    1,      1000,   1,          2           ],
/*        4-ML     */   [   (1/240),    (1/15),     (1/5),  0.001,  1,      0.001,      0.002       ],
/*        5-QUART  */   [   4,          64,         192,    1,      1000,   1,          2           ],
/*        6-PINT   */   [   2,          32,         96,     0.5,    500,    0.5,        1           ]
    ]

    // find keys
    for (let a = 0; a < keys.length; a++) {
        for (let b = 0; b < keys[a].length; b++) {
            if (unit1 == keys[a][b]) {
                unit1 = a;
            }
            if (unit2 == keys[a][b]) {
                unit2 = a;
            }
        }
    }

    // convert
    let converted_value;
    if (unit1 == "imperial" && unit2 == "metric") {

    }
    else if (unit1 == "metric" && unit2 == "imperial") {

    }
    else {
        for (let x = 0; x < chart.length; x++) {
            for (let y = 0; y < chart.length; y++) {
                if (unit1 == x && unit2 == y) {
                    converted_value = value * chart[x][y];
                }
            }
        }
    }
    return converted_value;
}    

// to print:
if (number % 1 >= 0.33 || number % 1 < 0.34) {
    number = parseInt(a)+"\u2153";
}