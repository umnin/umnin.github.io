// 数据API服务
class DataAPI {
    constructor(apiUrl) {
        this.apiUrl = apiUrl || 'https://your-username.github.io/your-repo/backend_data.json';
        this.cache = null;
        this.lastFetchTime = 0;
        this.cacheDuration = 30000; // 缓存30秒
    }
    
    // 获取所有数据
    async getAllData() {
        try {
            // 检查缓存
            if (this.cache && (Date.now() - this.lastFetchTime) < this.cacheDuration) {
                console.log('使用缓存数据');
                return this.cache;
            }
            
            console.log('从API获取数据:', this.apiUrl);
            
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors' // 支持跨域请求
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 更新缓存
            this.cache = data;
            this.lastFetchTime = Date.now();
            
            console.log('数据获取成功:', data);
            return data;
            
        } catch (error) {
            console.error('获取数据失败:', error);
            
            // 如果缓存存在，使用缓存数据
            if (this.cache) {
                console.log('使用缓存数据（API请求失败）');
                return this.cache;
            }
            
            // 返回默认数据
            return this.getDefaultData();
        }
    }
    
    // 获取统计数据
    async getStatistics() {
        const data = await this.getAllData();
        return data.statistics || this.getDefaultStatistics();
    }
    
    // 获取客户数据
    async getCustomers() {
        const data = await this.getAllData();
        return data.customers || {};
    }
    
    // 获取联系人数据
    async getContacts() {
        const data = await this.getAllData();
        return data.contacts || { colleagues: [], superiors: [], officials: [] };
    }
    
    // 获取错误数据
    async getErrors() {
        const data = await this.getAllData();
        return data.errors || [];
    }
    
    // 获取跟进问题
    async getFollowUpIssues() {
        const data = await this.getAllData();
        return data.follow_up_issues || [];
    }
    
    // 获取知识库数据
    async getKnowledgeBase() {
        const data = await this.getAllData();
        return data.knowledge_base || { categories: [], items: [] };
    }
    
    // 获取FAQ数据
    async getFAQItems() {
        const data = await this.getAllData();
        return data.faq_items || [];
    }
    
    // 获取推荐话术
    async getScriptTemplates() {
        const data = await this.getAllData();
        return data.script_templates || [];
    }
    
    // 保存数据（可选，需要服务器支持）
    async saveData(data) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('数据保存成功:', result);
            return result;
            
        } catch (error) {
            console.error('保存数据失败:', error);
            return false;
        }
    }
    
    // 获取默认数据（当API请求失败时使用）
    getDefaultData() {
        return {
            current_user: {
                id: "2524125",
                name: "冰音",
                account: "2524125-bingyin",
                position: "在线矫正客服",
                department: "客服部",
                status: "空闲",
                confidence: 100
            },
            customers: {},
            contacts: {
                colleagues: [],
                superiors: [],
                officials: []
            },
            statistics: this.getDefaultStatistics(),
            errors: [],
            follow_up_issues: [],
            knowledge_base: {
                categories: [],
                items: [],
                hot_items: [],
                recent_updates: [],
                stats: {}
            },
            faq_items: [],
            script_templates: []
        };
    }
    
    // 获取默认统计数据
    getDefaultStatistics() {
        return {
            reception_count: 0,
            satisfaction_rate: "--",
            work_days: 0,
            quota_remaining: 0,
            balance: 0.00,
            daily_stats: [0, 0, 0, 0, 0, 0, 0],
            days: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
            satisfaction_stats: [0, 0, 0, 0, 0, 0, 0],
            satisfaction_distribution: {
                labels: ["暂无数据"],
                sizes: [1],
                colors: ["#E0E0E0"]
            }
        };
    }
    
    // 清除缓存
    clearCache() {
        this.cache = null;
        this.lastFetchTime = 0;
        console.log('缓存已清除');
    }
    
    // 获取缓存状态
    getCacheStatus() {
        return {
            hasCache: !!this.cache,
            lastFetchTime: this.lastFetchTime,
            cacheAge: this.lastFetchTime ? Date.now() - this.lastFetchTime : 0,
            cacheDuration: this.cacheDuration
        };
    }
}

// 导出API实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataAPI;
} else if (typeof window !== 'undefined') {
    window.DataAPI = DataAPI;
}

// 示例用法
/*
const api = new DataAPI('https://your-username.github.io/your-repo/backend_data.json');

// 获取所有数据
api.getAllData().then(data => {
    console.log('所有数据:', data);
});

// 获取统计数据
api.getStatistics().then(stats => {
    console.log('统计数据:', stats);
});

// 获取客户数据
api.getCustomers().then(customers => {
    console.log('客户数据:', customers);
});
*/