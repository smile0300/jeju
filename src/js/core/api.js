import { CONFIG } from './config.js';

/**
 * 전용 API 헬퍼 함수
 * @param {string} endpoint 
 * @param {Object} params 
 * @returns {Promise<any>}
 */
export async function fetchPublicData(endpoint, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${CONFIG.PROXY_URL}/api/public-data?endpoint=${encodeURIComponent(endpoint)}&${queryParams}`;
    
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`API Request Failed: ${res.status}`);
    }
    return res;
}

/**
 * 텍스트/XML 응답을 위한 헬퍼
 */
export async function fetchPublicDataText(endpoint, params = {}) {
    const res = await fetchPublicData(endpoint, params);
    return res.text();
}

/**
 * JSON 응답을 위한 헬퍼 (v19.0: XML 강제 응답 대응 하이브리드 파싱)
 */
export async function fetchPublicDataJson(endpoint, params = {}) {
    const res = await fetchPublicData(endpoint, params);
    const text = await res.text();
    
    try {
        // 우선 JSON으로 파싱 시도
        return JSON.parse(text);
    } catch (e) {
        console.warn('[API] JSON 파싱 실패, XML 분석 시도:', endpoint);
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            
            // 기상청 XML 구조를 JSON 호환 객체로 변환
            const convertNode = (node) => {
                const obj = {};
                if (node.hasChildNodes()) {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        const child = node.childNodes[i];
                        if (child.nodeType === 1) { // Element
                            const name = child.nodeName;
                            const value = child.textContent;
                            if (child.childElementCount > 0) {
                                // 하위 아이템이 있는 경우 (items -> item)
                                if (name === 'item') {
                                    return convertNode(child);
                                }
                                obj[name] = convertNode(child);
                            } else {
                                obj[name] = value;
                            }
                        }
                    }
                }
                return obj;
            };

            // 기상청 표준 구조 대응 (response -> body -> items -> item)
            const itemsNode = xml.getElementsByTagName('items')[0];
            const itemNodes = xml.getElementsByTagName('item');
            
            const resultItems = [];
            for (let i = 0; i < itemNodes.length; i++) {
                resultItems.push(convertNode(itemNodes[i]));
            }

            return {
                response: {
                    header: { resultCode: '00', resultMsg: 'OK (XML Fallback)' },
                    body: {
                        items: { item: resultItems }
                    }
                }
            };
        } catch (xmlError) {
            console.error('[API] XML 파싱마저 실패:', xmlError);
            throw new Error('API Response is neither JSON nor valid XML');
        }
    }
}
