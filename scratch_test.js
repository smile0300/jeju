const fs = require('fs');

// Code.js 코드를 불러오기 위해 모의 객체(Mock) 생성
global.ContentService = {
  createTextOutput: function(text) {
    return {
      setMimeType: function(mime) {
        return text;
      }
    };
  },
  MimeType: { JSON: 'JSON' }
};

global.LockService = {
  getScriptLock: function() {
    return {
      waitLock: function() {},
      releaseLock: function() {}
    };
  }
};

global.Utilities = {
  formatDate: function() { return '2026-08-01'; }
};

global.MY_DEEPL = function(text, lang) {
  return "가짜_번역(" + lang + "): " + text;
};

// 243행까지 꽉 찬 가상의 스프레드시트를 만듭니다. (1행 헤더, 2행~243행 데이터)
var initialData = [];
// 1행 (헤더) - 일부러 빈 배열을 주거나, 헤더 이름을 안 맞춰서 writtenCount === 0이 발생하게 유도
initialData.push(['가짜헤더1', '가짜헤더2']); 
for (let i = 2; i <= 243; i++) {
  initialData.push(['더미데이터', '...', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
}

var mockSheet = {
  data: initialData,
  getName: function() { return 'LostReport'; },
  getLastColumn: function() { return this.data[0].length; },
  getLastRow: function() { return this.data.length; }, // 현재 243
  appendRow: function(row) {
    console.log(`[시트 모의] appendRow 호출됨! (현재 마지막 행 ${this.data.length} -> 새 행 ${this.data.length + 1} 생성)`);
    this.data.push(row);
  },
  getRange: function(row, col, numRows, numCols) {
    var self = this;
    if (numRows && numCols) { // 헤더 가져올 때
      return {
        getValues: function() {
          return [self.data[0].slice(0, col + numCols - 1)];
        }
      };
    }
    if (typeof row === 'string') { // "A:A"
      return {
        getValues: function() {
          // Timestamp 열 시뮬레이션
          return self.data.map((r, idx) => [idx === 0 ? "Timestamp" : "시간기록"]);
        }
      };
    }
    // 단일 셀 세팅
    return {
      setValue: function(val) {
        console.log(`[시트 모의] 셀 쓰기 성공: [${row}행, ${col}열] = ${val}`);
        while (self.data.length < row) self.data.push([]);
        self.data[row-1][col-1] = val;
      }
    };
  }
};

global.SpreadsheetApp = {
  openById: function() {
    return {
      getSheetByName: function(name) {
        if (name === 'LostReport') return mockSheet;
        return null;
      }
    };
  }
};

// 최신 Code.js 내용 실행
const code = fs.readFileSync('c:\\jeju-live\\src\\gas\\Code.js', 'utf8');
eval(code);

// 가상의 이벤트 객체 생성 (사용자 입력)
var e = {
  postData: {
    contents: JSON.stringify({
      type: 'lost_report',
      specifics: '검은색 지갑',
      detailLocation: '테디베어 뮤지엄 앞',
      hotelName: '신라호텔',
      photo: ''
    })
  }
};

console.log("=== 테스트 1: 새 분실물 접수 (doPost) ===");
var result = doPost(e);
console.log("=== doPost 실행 완료 ===\n");

// 244행에 정확하게 기록되었는지 확인
var addedRow = mockSheet.data[243]; // 0-indexed이므로 243이 244행
console.log("=== 검증: 244행 상태 ===");
console.log(`244행 4열(D열 specifics): ${addedRow[3]}`);
console.log(`244행 8열(H열 detailLocation): ${addedRow[7]}`);
console.log(`244행 22열(V열 번역결과): ${addedRow[21]}`);
