import React, { useState, useEffect, useCallback } from 'react';
import {
User, Target, Trophy, Coins, Settings, MessageCircle, Star, Sword, Heart, Brain, Eye, Zap,
Calendar, Plus, CheckCircle, Clock, Award, Users, DollarSign, Lightbulb, Compass, X,
ChevronRight, Home, Bell, RefreshCw, Save, AlertCircle, Loader, Database, Link, Check,
Wifi, WifiOff, CloudOff, Cloud, Edit3, Trash2
} from 'lucide-react';

const LevelUpApp = () => {
// Core State
const [activeTab, setActiveTab] = useState('dashboard');
const [showChat, setShowChat] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [showResourceModal, setShowResourceModal] = useState(false);
const [showCharacterModal, setShowCharacterModal] = useState(false);
const [loading, setLoading] = useState(false);
const [syncing, setSyncing] = useState(false);
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);

// Connection State
const [isConnected, setIsConnected] = useState(false);
const [lastSync, setLastSync] = useState(null);
const [connectionTested, setConnectionTested] = useState(false);

// Settings State with localStorage
const [settings, setSettings] = useState({
sheetId: '',
apiKey: '',
autoSync: false,
syncInterval: 5
});

// Data State - All empty initially
const [character, setCharacter] = useState({
name: '',
avatar: '',
birthYear: null,
level: 1,
exp: 0,
expToNext: 100,
stats: { WILL: 10, PHY: 10, MEN: 10, AWR: 10, EXE: 10 }
});

const [quests, setQuests] = useState([]);
const [achievements, setAchievements] = useState([]);
const [goals, setGoals] = useState({ mission: '', yearly: [], quarterly: [], monthly: [] });
const [resources, setResources] = useState([
{ name: "Xã hội", icon: Users, color: "from-blue-500 to-blue-600", textColor: "text-blue-400", level: 1, progress: 0, description: "Xây dựng quan hệ, kết nối" },
{ name: "Tài chính", icon: DollarSign, color: "from-green-500 to-green-600", textColor: "text-green-400", level: 1, progress: 0, description: "Tiền bạc, đầu tư, tài sản" },
{ name: "Kiến tạo", icon: Lightbulb, color: "from-purple-500 to-purple-600", textColor: "text-purple-400", level: 1, progress: 0, description: "Sáng tạo, kỹ năng, kiến thức" },
{ name: "Khám phá", icon: Compass, color: "from-orange-500 to-orange-600", textColor: "text-orange-400", level: 1, progress: 0, description: "Trải nghiệm, học hỏi, chinh phục" }
]);
const [resourceDetails, setResourceDetails] = useState({});
const [selectedResource, setSelectedResource] = useState(null);
const [resourceForm, setResourceForm] = useState({
id: null,
name: '',
amount: '',
type: 'asset',
notes: ''
});
const [characterForm, setCharacterForm] = useState({
name: '',
avatar: '',
birthYear: ''
});
const [avatarPreview, setAvatarPreview] = useState('');
const [chatMessages, setChatMessages] = useState([]);
const [chatInput, setChatInput] = useState("");

// Google Sheets API Configuration
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_RANGES = {
character: 'Character!A1:B25',
quests: 'Quests!A2:K1000',
achievements: 'Achievements!A2:I1000',
goals: 'Goals!A1:E100',
resources: 'Resources!A2:F10',
resourceDetails: 'ResourceDetails!A2:G1000',
chat: 'Chat!A2:E1000'
};

// Load settings from localStorage on mount
useEffect(() => {
const savedSettings = {
sheetId: localStorage.getItem('levelup_sheet_id') || '',
apiKey: localStorage.getItem('levelup_api_key') || '',
autoSync: localStorage.getItem('levelup_auto_sync') === 'true',
syncInterval: parseInt(localStorage.getItem('levelup_sync_interval')) || 5
};
setSettings(savedSettings);

// Auto-connect if credentials exist
if (savedSettings.sheetId && savedSettings.apiKey) {
  testConnection(savedSettings.sheetId, savedSettings.apiKey);
}
}, []);

// Auto-sync setup
useEffect(() => {
if (settings.autoSync && isConnected && settings.sheetId && settings.apiKey) {
const interval = setInterval(() => {
syncFromSheets();
}, settings.syncInterval * 60 * 1000);
return () => clearInterval(interval);
}
}, [settings.autoSync, settings.syncInterval, isConnected]);

// Google Sheets API Functions
const makeSheetRequest = async (url, options = {}) => {
try {
const response = await fetch(url, {
...options,
headers: {
'Content-Type': 'application/json',
...options.headers
}
});

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
} catch (error) {
  console.error('Sheet request failed:', error);
  throw error;
}
};

const testConnection = async (sheetId = settings.sheetId, apiKey = settings.apiKey) => {
if (!sheetId || !apiKey) {
setError('Vui lòng nhập đầy đủ Sheet ID và API Key');
return false;
}

try {
  setLoading(true);
  setError(null);

  const url = `${SHEETS_API_BASE}/${sheetId}?key=${apiKey}`;
  await makeSheetRequest(url);
  
  setIsConnected(true);
  setConnectionTested(true);
  setSuccess('Kết nối thành công!');
  
  // Auto-sync after successful connection
  await syncFromSheets(sheetId, apiKey);
  
  return true;
} catch (error) {
  setIsConnected(false);
  setConnectionTested(true);
  
  if (error.message.includes('403')) {
    setError('API Key không hợp lệ hoặc không có quyền truy cập');
  } else if (error.message.includes('404')) {
    setError('Không tìm thấy Google Sheet với ID này');
  } else {
    setError(`Lỗi kết nối: ${error.message}`);
  }
  return false;
} finally {
  setLoading(false);
}
};

const readSheetRange = async (range, sheetId = settings.sheetId, apiKey = settings.apiKey) => {
const url = `${SHEETS_API_BASE}/${sheetId}/values/${range}?key=${apiKey}`;
const response = await makeSheetRequest(url);
return response.values || [];
};

const writeSheetRange = async (range, values, sheetId = settings.sheetId, apiKey = settings.apiKey) => {
const url = `${SHEETS_API_BASE}/${sheetId}/values/${range}?valueInputOption=RAW&key=${apiKey}`;
await makeSheetRequest(url, {
method: 'PUT',
body: JSON.stringify({ values })
});
};

const appendSheetRow = async (range, values, sheetId = settings.sheetId, apiKey = settings.apiKey) => {
const url = `${SHEETS_API_BASE}/${sheetId}/values/${range}:append?valueInputOption=RAW&key=${apiKey}`;
await makeSheetRequest(url, {
method: 'POST',
body: JSON.stringify({ values: [values] })
});
};

// Data Sync Functions
const syncFromSheets = async (sheetId = settings.sheetId, apiKey = settings.apiKey) => {
if (!sheetId || !apiKey) return;

try {
  setSyncing(true);
  setError(null);

  // Sync Character Data
  try {
    const characterData = await readSheetRange(SHEET_RANGES.character, sheetId, apiKey);
    if (characterData.length > 0) {
      const charObj = { ...character };
      characterData.forEach(([key, value]) => {
        if (key === 'stats') {
          try {
            charObj.stats = JSON.parse(value || '{"WILL":10,"PHY":10,"MEN":10,"AWR":10,"EXE":10}');
          } catch {
            charObj.stats = { WILL: 10, PHY: 10, MEN: 10, AWR: 10, EXE: 10 };
          }
        } else if (['level', 'exp', 'expToNext', 'birthYear'].includes(key)) {
          charObj[key] = parseInt(value) || (key === 'level' ? 1 : key === 'expToNext' ? 100 : key === 'birthYear' ? null : 0);
        } else if (key === 'name') {
          charObj[key] = value || '';
        } else if (key === 'avatar') {
          charObj[key] = value || '';
        }
      });
      setCharacter(charObj);
    }
  } catch (error) {
    console.warn('Character sheet not found or invalid:', error);
  }

  // Sync Quests Data
  try {
    const questsData = await readSheetRange(SHEET_RANGES.quests, sheetId, apiKey);
    const questsList = questsData
      .filter(row => row[0])
      .map((row, index) => ({
        id: index + 1,
        title: row[0] || '',
        description: row[1] || '',
        requiredStat: row[2] || 'WILL',
        difficulty: Math.max(1, Math.min(5, parseInt(row[3]) || 1)),
        deadline: row[4] || '',
        rewardExp: parseInt(row[5]) || 0,
        rewardStat: row[6] || '',
        status: ['todo', 'in-progress', 'completed'].includes(row[7]) ? row[7] : 'todo',
        category: row[8] || 'general',
        priority: ['high', 'medium', 'low'].includes(row[9]) ? row[9] : 'medium'
      }));
    setQuests(questsList);
  } catch (error) {
    console.warn('Quests sheet not found:', error);
    setQuests([]);
  }

  // Sync Achievements Data
  try {
    const achievementsData = await readSheetRange(SHEET_RANGES.achievements, sheetId, apiKey);
    const achievementsList = achievementsData
      .filter(row => row[0])
      .map((row, index) => ({
        id: index + 1,
        title: row[0] || '',
        description: row[1] || '',
        icon: row[2] || '🏆',
        tier: ['bronze', 'silver', 'gold', 'legendary'].includes(row[3]) ? row[3] : 'bronze',
        unlocked: row[4] === 'TRUE' || row[4] === true,
        unlockedDate: row[5] || '',
        progress: Math.max(0, Math.min(100, parseInt(row[6]) || 0)),
        condition: row[7] || '',
        category: row[8] || 'general'
      }));
    setAchievements(achievementsList);
  } catch (error) {
    console.warn('Achievements sheet not found:', error);
    setAchievements([]);
  }

  // Sync Goals Data
  try {
    const goalsData = await readSheetRange(SHEET_RANGES.goals, sheetId, apiKey);
    const goalsObj = { mission: '', yearly: [], quarterly: [], monthly: [] };
    
    goalsData.forEach(([type, title, progress, deadline, category]) => {
      if (type === 'mission' && title) {
        goalsObj.mission = title;
      } else if (['yearly', 'quarterly', 'monthly'].includes(type) && title) {
        goalsObj[type].push({
          title,
          progress: Math.max(0, Math.min(100, parseInt(progress) || 0)),
          deadline: deadline || '',
          category: category || 'general'
        });
      }
    });
    setGoals(goalsObj);
  } catch (error) {
    console.warn('Goals sheet not found:', error);
  }

  // Sync Resources Data
  try {
    const resourcesData = await readSheetRange(SHEET_RANGES.resources, sheetId, apiKey);
    if (resourcesData.length > 0) {
      const updatedResources = resources.map(resource => {
        const matchingRow = resourcesData.find(row => row[0] === resource.name);
        if (matchingRow) {
          return {
            ...resource,
            level: Math.max(1, parseInt(matchingRow[1]) || 1),
            progress: Math.max(0, Math.min(100, parseInt(matchingRow[2]) || 0)),
            nextMilestone: matchingRow[3] || '',
            relatedQuests: parseInt(matchingRow[4]) || 0
          };
        }
        return resource;
      });
      setResources(updatedResources);
    }
  } catch (error) {
    console.warn('Resources sheet not found:', error);
  }

  // Sync Resource Details
  try {
    const resourceDetailsData = await readSheetRange(SHEET_RANGES.resourceDetails, sheetId, apiKey);
    const detailsObj = {};
    
    resourceDetailsData
      .filter(row => row[0])
      .forEach((row, index) => {
        const resourceName = row[0];
        if (!detailsObj[resourceName]) {
          detailsObj[resourceName] = [];
        }
        detailsObj[resourceName].push({
          id: index + 1,
          name: row[1] || '',
          amount: parseFloat(row[2]) || 0,
          type: ['asset', 'loan', 'investment', 'income', 'expense'].includes(row[3]) ? row[3] : 'asset',
          notes: row[4] || '',
          date: row[5] || new Date().toLocaleDateString('vi-VN'),
          status: row[6] || 'active'
        });
      });
    
    setResourceDetails(detailsObj);
  } catch (error) {
    console.warn('ResourceDetails sheet not found:', error);
    setResourceDetails({});
  }

  // Sync Chat Messages
  try {
    const chatData = await readSheetRange(SHEET_RANGES.chat, sheetId, apiKey);
    const messagesList = chatData
      .filter(row => row[0])
      .map((row, index) => ({
        id: index + 1,
        text: row[0] || '',
        timestamp: row[1] || '',
        type: ['note', 'reminder', 'achievement'].includes(row[2]) ? row[2] : 'note',
        date: row[3] || '',
        author: row[4] || 'user'
      }))
      .sort((a, b) => new Date(a.date + ' ' + a.timestamp) - new Date(b.date + ' ' + b.timestamp));
    setChatMessages(messagesList);
  } catch (error) {
    console.warn('Chat sheet not found:', error);
    setChatMessages([]);
  }

  setLastSync(new Date());
  setSuccess('Đồng bộ thành công!');
  
} catch (error) {
  console.error('Sync failed:', error);
  setError(`Lỗi đồng bộ: ${error.message}`);
  setIsConnected(false);
} finally {
  setSyncing(false);
}
};

const updateQuest = async (questId, updates) => {
try {
setSyncing(true);

  const questIndex = quests.findIndex(q => q.id === questId);
  if (questIndex === -1) return;

  const updatedQuest = { ...quests[questIndex], ...updates };
  const newQuests = [...quests];
  newQuests[questIndex] = updatedQuest;
  setQuests(newQuests);

  // Sync to sheets
  const questRow = [
    updatedQuest.title, updatedQuest.description, updatedQuest.requiredStat,
    updatedQuest.difficulty, updatedQuest.deadline, updatedQuest.rewardExp,
    updatedQuest.rewardStat, updatedQuest.status, updatedQuest.category, updatedQuest.priority
  ];
  
  await writeSheetRange(`Quests!A${questIndex + 2}:J${questIndex + 2}`, [questRow]);
  
} catch (error) {
  setError(`Lỗi cập nhật nhiệm vụ: ${error.message}`);
} finally {
  setSyncing(false);
}
};

const updateCharacter = async (updates) => {
try {
setSyncing(true);

  const updatedCharacter = { ...character, ...updates };
  setCharacter(updatedCharacter);

  // Sync to sheets
  const charData = [
    ['name', updatedCharacter.name],
    ['avatar', updatedCharacter.avatar],
    ['birthYear', updatedCharacter.birthYear || ''],
    ['level', updatedCharacter.level],
    ['exp', updatedCharacter.exp],
    ['expToNext', updatedCharacter.expToNext],
    ['stats', JSON.stringify(updatedCharacter.stats)]
  ];
  
  await writeSheetRange('Character!A1:B7', charData);
  
} catch (error) {
  setError(`Lỗi cập nhật nhân vật: ${error.message}`);
} finally {
  setSyncing(false);
}
};

const addChatMessage = async (message) => {
try {
setSyncing(true);

  const newMessage = {
    id: Date.now(),
    text: message.text,
    timestamp: message.timestamp || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    type: message.type || 'note',
    date: new Date().toLocaleDateString('vi-VN'),
    author: 'user'
  };

  setChatMessages(prev => [...prev, newMessage]);

  // Sync to sheets
  const chatRow = [
    newMessage.text, newMessage.timestamp, newMessage.type, newMessage.date, newMessage.author
  ];
  
  await appendSheetRow('Chat!A:E', chatRow);
  
} catch (error) {
  setError(`Lỗi thêm tin nhắn: ${error.message}`);
} finally {
  setSyncing(false);
}
};

const addResourceDetail = async (resourceName, detail) => {
try {
setSyncing(true);

  const newDetail = {
    id: Date.now(),
    name: detail.name,
    amount: parseFloat(detail.amount) || 0,
    type: detail.type,
    notes: detail.notes,
    date: new Date().toLocaleDateString('vi-VN'),
    status: 'active'
  };

  // Update local state
  setResourceDetails(prev => ({
    ...prev,
    [resourceName]: [...(prev[resourceName] || []), newDetail]
  }));

  // Sync to sheets
  const detailRow = [
    resourceName, newDetail.name, newDetail.amount, newDetail.type, 
    newDetail.notes, newDetail.date, newDetail.status
  ];
  
  await appendSheetRow('ResourceDetails!A:G', detailRow);
  
  setSuccess('Thêm chi tiết thành công!');
  
} catch (error) {
  setError(`Lỗi thêm chi tiết: ${error.message}`);
} finally {
  setSyncing(false);
}
};

const deleteResourceDetail = async (resourceName, detailId) => {
try {
setSyncing(true);

  // Update local state
  setResourceDetails(prev => ({
    ...prev,
    [resourceName]: (prev[resourceName] || []).filter(d => d.id !== detailId)
  }));

  // Re-sync to update the sheet
  await syncFromSheets();
  
  setSuccess('Xóa chi tiết thành công!');
  
} catch (error) {
  setError(`Lỗi xóa chi tiết: ${error.message}`);
} finally {
  setSyncing(false);
}
};

// User Actions
const completeQuest = async (questId) => {
const quest = quests.find(q => q.id === questId);
if (!quest || quest.status === 'completed') return;

// Update quest status
await updateQuest(questId, { status: 'completed' });

// Update character EXP
const newExp = character.exp + quest.rewardExp;
let newLevel = character.level;
let newExpToNext = character.expToNext;

// Level up check
if (newExp >= character.expToNext) {
  newLevel += 1;
  newExpToNext = character.expToNext + 100; // Increase EXP needed for next level
}

await updateCharacter({ 
  exp: newExp, 
  level: newLevel, 
  expToNext: newExpToNext 
});

// Add achievement message
await addChatMessage({
  text: `🎉 Hoàn thành: ${quest.title} (+${quest.rewardExp} EXP)`,
  type: 'achievement'
});

if (newLevel > character.level) {
  await addChatMessage({
    text: `🎊 Chúc mừng! Bạn đã lên Level ${newLevel}!`,
    type: 'achievement'
  });
}
};

const sendChatMessage = async () => {
if (!chatInput.trim()) return;

await addChatMessage({
  text: chatInput,
  type: 'note'
});

setChatInput('');
};

const saveSettings = async () => {
try {
setLoading(true);
setError(null);

  // Save to localStorage
  localStorage.setItem('levelup_sheet_id', settings.sheetId);
  localStorage.setItem('levelup_api_key', settings.apiKey);
  localStorage.setItem('levelup_auto_sync', settings.autoSync);
  localStorage.setItem('levelup_sync_interval', settings.syncInterval);

  // Test connection and sync if successful
  if (settings.sheetId && settings.apiKey) {
    const connected = await testConnection();
    if (connected) {
      setSuccess('Cài đặt đã được lưu và kết nối thành công!');
    }
  } else {
    setSuccess('Cài đặt đã được lưu!');
  }
  
} catch (error) {
  setError(`Lỗi lưu cài đặt: ${error.message}`);
} finally {
  setLoading(false);
}
};

const handleResourceFormSubmit = async () => {
if (!resourceForm.name || !resourceForm.amount) {
setError('Vui lòng điền đầy đủ thông tin bắt buộc');
return;
}

if (resourceForm.id) {
  // Update existing - just re-sync for now
  await syncFromSheets();
} else {
  // Add new
  await addResourceDetail(selectedResource, resourceForm);
}

setShowResourceModal(false);
setResourceForm({ id: null, name: '', amount: '', type: 'asset', notes: '' });
setSelectedResource(null);
};

const handleAvatarUpload = (event) => {
const file = event.target.files[0];
if (file) {
// Check file size (max 5MB)
if (file.size > 5 * 1024 * 1024) {
setError('Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB');
return;
}

  // Check file type
  if (!file.type.startsWith('image/')) {
    setError('Vui lòng chọn file ảnh hợp lệ');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    setAvatarPreview(base64);
    setCharacterForm(prev => ({ ...prev, avatar: base64 }));
  };
  reader.readAsDataURL(file);
}
};

const handleAvatarUrl = (url) => {
setAvatarPreview(url);
setCharacterForm(prev => ({ ...prev, avatar: url }));
};

const handleCharacterFormSubmit = async () => {
if (!characterForm.name.trim()) {
setError('Vui lòng nhập tên nhân vật');
return;
}

// Validate birth year if provided
if (characterForm.birthYear) {
  const birthYear = parseInt(characterForm.birthYear);
  const currentYear = new Date().getFullYear();
  
  if (isNaN(birthYear) || birthYear < 1900 || birthYear > currentYear) {
    setError('Năm sinh không hợp lệ (1900 - hiện tại)');
    return;
  }
}

await updateCharacter({
  name: characterForm.name,
  avatar: characterForm.avatar,
  birthYear: characterForm.birthYear ? parseInt(characterForm.birthYear) : null
});

setShowCharacterModal(false);
setCharacterForm({ name: '', avatar: '', birthYear: '' });
setAvatarPreview('');
};

const openCharacterModal = () => {
setCharacterForm({
name: character.name,
avatar: character.avatar,
birthYear: character.birthYear ? character.birthYear.toString() : ''
});
setAvatarPreview(character.avatar);
setShowCharacterModal(true);
};

// Helper Functions
const getStatIcon = (stat) => ({ WILL: Heart, PHY: Sword, MEN: Brain, AWR: Eye, EXE: Zap }[stat] || Star);
const getStatColor = (stat) => ({ WILL: "text-red-400", PHY: "text-orange-400", MEN: "text-blue-400", AWR: "text-purple-400", EXE: "text-yellow-400" }[stat] || "text-gray-400");
const getDifficultyStars = (difficulty) => Array.from({ length: difficulty }, (_, i) => <Star key={i} size={12} className="text-yellow-400 fill-current" />);
const getStatusColor = (status) => ({ completed: 'from-green-500 to-green-600', 'in-progress': 'from-blue-500 to-blue-600' }[status] || 'from-gray-500 to-gray-600');
const getPriorityColor = (priority) => ({ high: 'bg-red-500', medium: 'bg-yellow-500' }[priority] || 'bg-gray-500');
const getTierColor = (tier) => ({ bronze: 'text-amber-500', silver: 'text-gray-300', gold: 'text-yellow-400', legendary: 'text-purple-400' }[tier] || 'text-gray-500');

const formatCurrency = (amount) => {
if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
return amount.toLocaleString('vi-VN');
};

const calculateAge = (birthYear) => {
if (!birthYear) return null;
const currentYear = new Date().getFullYear();
return currentYear - birthYear;
};

const getAgeDisplay = (birthYear) => {
const age = calculateAge(birthYear);
return age ? `${age} tuổi` : '';
};

const getResourceTotal = (resourceName) => {
const details = resourceDetails[resourceName] || [];
return details
.filter(d => d.status === 'active')
.reduce((total, detail) => {
if (detail.type === 'asset' || detail.type === 'income' || detail.type === 'investment') {
return total + detail.amount;
} else if (detail.type === 'loan' || detail.type === 'expense') {
return total - detail.amount;
}
return total;
}, 0);
};

const getTypeIcon = (type) => {
switch(type) {
case 'asset': return '💰';
case 'loan': return '📋';
case 'investment': return '📈';
case 'income': return '💸';
case 'expense': return '💳';
default: return '💰';
}
};

const getTypeColor = (type) => {
switch(type) {
case 'asset': return 'text-green-400';
case 'loan': return 'text-orange-400';
case 'investment': return 'text-blue-400';
case 'income': return 'text-emerald-400';
case 'expense': return 'text-red-400';
default: return 'text-gray-400';
}
};

// Clear messages after delay
useEffect(() => {
if (success) {
const timer = setTimeout(() => setSuccess(null), 3000);
return () => clearTimeout(timer);
}
}, [success]);

useEffect(() => {
if (error) {
const timer = setTimeout(() => setError(null), 5000);
return () => clearTimeout(timer);
}
}, [error]);

const navItems = [
{ id: 'dashboard', icon: Home, label: 'Trang chủ' },
{ id: 'character', icon: User, label: 'Nhân vật' },
{ id: 'quests', icon: Sword, label: 'Nhiệm vụ' },
{ id: 'resources', icon: Coins, label: 'Nguồn vốn' },
{ id: 'achievements', icon: Trophy, label: 'Danh hiệu' }
];

// Components
const EmptyState = ({ icon: Icon, title, description, action }) => (
<div className="text-center py-12">
<Icon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
<h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
<p className="text-gray-500 mb-6 text-sm leading-relaxed">{description}</p>
{action}
</div>
);

const ConnectionIndicator = () => (
<div className={`flex items-center space-x-2 text-xs px-3 py-1 rounded-full transition-colors ${ isConnected ? 'bg-green-500/20 text-green-400' : connectionTested ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400' }`}>
{isConnected ? <Cloud size={12} /> : connectionTested ? <CloudOff size={12} /> : <WifiOff size={12} />}
<span>
{isConnected ? 'Đã kết nối' : connectionTested ? 'Lỗi kết nối' : 'Chưa kết nối'}
</span>
</div>
);

const StatusMessage = () => {
if (success) {
return (
<div className="fixed top-20 left-4 right-4 bg-green-500/20 border border-green-500/50 rounded-xl p-3 z-50 backdrop-blur-sm">
<div className="flex items-center space-x-2 text-green-400">
<Check size={16} />
<span className="text-sm font-medium">{success}</span>
</div>
</div>
);
}

if (error) {
  return (
    <div className="fixed top-20 left-4 right-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3 z-50 backdrop-blur-sm">
      <div className="flex items-center space-x-2 text-red-400">
        <AlertCircle size={16} />
        <span className="text-sm font-medium">{error}</span>
      </div>
    </div>
  );
}

return null;
};

// Render Functions
const renderDashboard = () => {
if (!isConnected && connectionTested) {
return (
<div className="px-4 pb-6">
<EmptyState
icon={CloudOff}
title="Chưa kết nối Google Sheets"
description="Kết nối với Google Sheets để bắt đầu hành trình RPG Self-Development của bạn. Tất cả dữ liệu sẽ được đồng bộ tự động."
action={
<button
onClick={() => setShowSettings(true)}
className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-medium transition-colors"
>
Kết nối ngay
</button>
}
/>
</div>
);
}

if (!isConnected && !connectionTested) {
  return (
    <div className="px-4 pb-6">
      <EmptyState
        icon={Database}
        title="Khởi tạo kết nối"
        description="Vui lòng thiết lập kết nối Google Sheets để sử dụng ứng dụng."
        action={
          <button
            onClick={() => setShowSettings(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-medium"
          >
            Cài đặt kết nối
          </button>
        }
      />
    </div>
  );
}

const completedQuests = quests.filter(q => q.status === 'completed').length;
const unlockedAchievements = achievements.filter(a => a.unlocked).length;
const highPriorityQuests = quests.filter(q => q.priority === 'high' && q.status !== 'completed');

return (
  <div className="space-y-6 px-4 pb-6">
    {/* Welcome */}
    <div className="text-center py-6">
      <h2 className="text-2xl font-bold text-white mb-2">
        Chào mừng trở lại, {character.name || 'Hero'}! 👋
      </h2>
      <p className="text-gray-400">Hãy cùng chinh phục những thử thách hôm nay</p>
    </div>

    {/* Character Summary */}
    <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-3xl p-6 border border-indigo-500/20 backdrop-blur-sm">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg overflow-hidden">
          {character.avatar ? (
            <img 
              src={character.avatar} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-full h-full flex items-center justify-center ${character.avatar ? 'hidden' : ''}`}>
            🧙‍♂️
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">{character.name || 'Hero'}</h3>
          <div className="text-sm text-indigo-300 mb-1">Level {character.level} • RPG Developer</div>
          {character.birthYear && (
            <div className="text-xs text-gray-400 mb-2">{getAgeDisplay(character.birthYear)}</div>
          )}
          <div className="w-full bg-gray-800/50 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (character.exp / character.expToNext) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {character.exp} / {character.expToNext} EXP
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {Object.entries(character.stats).map(([stat, value]) => {
          const StatIcon = getStatIcon(stat);
          const statColor = getStatColor(stat);
          return (
            <div key={stat} className="bg-black/20 rounded-2xl p-3 text-center backdrop-blur-sm">
              <StatIcon className={`w-5 h-5 mx-auto mb-1 ${statColor}`} />
              <div className="text-xs text-gray-300 mb-1">{stat}</div>
              <div className="text-sm font-bold text-white">{value}</div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Priority Quests */}
    {highPriorityQuests.length > 0 ? (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">🎯 Nhiệm vụ ưu tiên</h3>
            <p className="text-sm text-gray-400">Hôm nay • {highPriorityQuests.length} nhiệm vụ</p>
          </div>
          <button 
            onClick={() => setActiveTab('quests')}
            className="text-blue-400 text-sm flex items-center bg-blue-500/10 px-3 py-2 rounded-xl"
          >
            Xem tất cả <ChevronRight size={16} className="ml-1" />
          </button>
        </div>
        
        <div className="space-y-4">
          {highPriorityQuests.slice(0, 2).map(quest => (
            <div key={quest.id} className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/30">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(quest.priority)}`} />
                    <h4 className="text-white font-medium">{quest.title}</h4>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{quest.description}</p>
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="flex">{getDifficultyStars(quest.difficulty)}</div>
                    </div>
                    <span className="text-orange-400">⏰ {quest.deadline}</span>
                    <span className="text-green-400">+{quest.rewardExp} EXP</span>
                  </div>
                </div>
                <button 
                  onClick={() => completeQuest(quest.id)}
                  disabled={syncing}
                  className="bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-400 p-2 rounded-xl border border-green-500/30"
                >
                  {syncing ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : quests.length === 0 ? (
      <EmptyState
        icon={Target}
        title="Chưa có nhiệm vụ nào"
        description="Thêm nhiệm vụ trong Google Sheets (tab Quests) để bắt đầu cuộc phiêu lưu RPG của bạn."
        action={
          <button
            onClick={() => setActiveTab('quests')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
          >
            Xem hướng dẫn
          </button>
        }
      />
    ) : (
      <EmptyState
        icon={CheckCircle}
        title="Hoàn thành tuyệt vời!"
        description="Bạn đã hoàn thành tất cả nhiệm vụ ưu tiên. Thêm nhiệm vụ mới để tiếp tục phát triển."
        action={
          <button
            onClick={() => setActiveTab('quests')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
          >
            Xem tất cả nhiệm vụ
          </button>
        }
      />
    )}

    {/* Stats */}
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-2xl p-5 border border-blue-500/20">
        <div className="text-2xl font-bold text-white mb-1">{completedQuests}</div>
        <div className="text-sm text-blue-300">Nhiệm vụ hoàn thành</div>
        <div className="text-xs text-blue-400 mt-1">Tổng cộng</div>
      </div>
      <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 rounded-2xl p-5 border border-purple-500/20">
        <div className="text-2xl font-bold text-white mb-1">{unlockedAchievements}</div>
        <div className="text-sm text-purple-300">Danh hiệu đạt được</div>
        <div className="text-xs text-purple-400 mt-1">Tổng cộng</div>
      </div>
    </div>
  </div>
);
};

const renderCharacter = () => (
<div className="space-y-6 px-4 pb-6">
<div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-3xl p-6 border border-indigo-500/20">
<div className="text-center mb-6">
<div className="relative inline-block">
<div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 shadow-2xl overflow-hidden">
{character.avatar ? (
<img
src={character.avatar}
alt="Avatar"
className="w-full h-full object-cover"
onError={(e) => {
e.target.style.display = 'none';
e.target.nextSibling.style.display = 'flex';
}}
/>
) : null}
<div className={`w-full h-full flex items-center justify-center ${character.avatar ? 'hidden' : ''}`}>
🧙‍♂️
</div>
</div>
<button
onClick={openCharacterModal}
className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
>
<Edit3 size={16} className="text-white" />
</button>
</div>
<h2 className="text-2xl font-bold text-white mb-1">{character.name || 'Hero'}</h2>
<div className="text-lg text-indigo-300 mb-1">Level {character.level} RPG Developer</div>
{character.birthYear && (
<div className="text-sm text-gray-400 mb-2">{getAgeDisplay(character.birthYear)}</div>
)}
</div>

    <div className="mb-6">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-300">Kinh nghiệm</span>
        <span className="text-gray-300">{character.exp} / {character.expToNext}</span>
      </div>
      <div className="w-full bg-gray-800/50 rounded-full h-4 relative overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, (character.exp / character.expToNext) * 100)}%` }}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      {Object.entries(character.stats).map(([stat, value]) => {
        const StatIcon = getStatIcon(stat);
        const statColor = getStatColor(stat);
        return (
          <div key={stat} className="bg-black/20 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/5">
            <StatIcon className={`w-8 h-8 mx-auto mb-2 ${statColor}`} />
            <div className="text-xs text-gray-300 mb-1">{stat}</div>
            <div className="text-xl font-bold text-white">{value}</div>
          </div>
        );
      })}
    </div>
  </div>

  {achievements.filter(a => a.unlocked).length > 0 && (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50">
      <h3 className="text-lg font-bold text-white mb-4">🏆 Danh hiệu gần đây</h3>
      <div className="grid grid-cols-2 gap-3">
        {achievements.filter(a => a.unlocked).slice(-4).map(achievement => (
          <div key={achievement.id} className="bg-gray-800/50 rounded-2xl p-4 text-center border border-gray-700/30">
            <div className="text-3xl mb-2">{achievement.icon}</div>
            <div className={`text-sm font-bold ${getTierColor(achievement.tier)} mb-1`}>
              {achievement.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50">
    <h3 className="text-lg font-bold text-white mb-4">📊 Thông tin cá nhân</h3>
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Tên nhân vật:</span>
        <span className="text-white font-bold">{character.name || 'Chưa đặt tên'}</span>
      </div>
      {character.birthYear && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Năm sinh:</span>
            <span className="text-white font-bold">{character.birthYear}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Tuổi hiện tại:</span>
            <span className="text-blue-400 font-bold">{calculateAge(character.birthYear)} tuổi</span>
          </div>
        </>
      )}
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Tổng EXP kiếm được:</span>
        <span className="text-white font-bold">{character.exp}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Nhiệm vụ hoàn thành:</span>
        <span className="text-white font-bold">{quests.filter(q => q.status === 'completed').length}/{quests.length}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Tỷ lệ hoàn thành:</span>
        <span className="text-green-400 font-bold">
          {quests.length > 0 ? Math.round((quests.filter(q => q.status === 'completed').length / quests.length) * 100) : 0}%
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Danh hiệu đạt được:</span>
        <span className="text-purple-400 font-bold">{achievements.filter(a => a.unlocked).length}/{achievements.length}</span>
      </div>
    </div>
  </div>
</div>
);

const renderQuests = () => (
<div className="space-y-6 px-4 pb-6">
<div className="flex justify-between items-center">
<div>
<h2 className="text-xl font-bold text-white">⚔️ Nhiệm vụ</h2>
<p className="text-sm text-gray-400">
{quests.filter(q => q.status !== 'completed').length} nhiệm vụ đang chờ
</p>
</div>
<button 
onClick={syncFromSheets}
disabled={syncing}
className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-3 rounded-2xl shadow-lg transition-colors"
>
{syncing ? <Loader className="animate-spin" size={20} /> : <RefreshCw size={20} />}
</button>
</div>

  {quests.length === 0 ? (
    <EmptyState
      icon={Sword}
      title="Chưa có nhiệm vụ nào"
      description="Thêm nhiệm vụ trong Google Sheets tab 'Quests' với cấu trúc: Title | Description | RequiredStat | Difficulty | Deadline | RewardEXP | RewardStat | Status | Category | Priority"
      action={
        <div className="space-y-3">
          <button
            onClick={() => setShowSettings(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
          >
            Mở cài đặt
          </button>
          <div className="text-xs text-gray-500">
            Ví dụ: "Tập thể dục | Chạy bộ 30 phút | PHY | 3 | Hôm nay | 50 | PHY +1 | todo | health | high"
          </div>
        </div>
      }
    />
  ) : (
    <div className="space-y-4">
      {quests.map(quest => (
        <div key={quest.id} className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl border border-gray-700/50 overflow-hidden backdrop-blur-sm">
          <div className={`h-1 bg-gradient-to-r ${getStatusColor(quest.status)}`} />
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start space-x-3 flex-1">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor(quest.priority)} mt-1 flex-shrink-0`} />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{quest.title}</h3>
                  <p className="text-gray-300 text-sm mb-3">{quest.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-400">Độ khó:</span>
                      <div className="flex">{getDifficultyStars(quest.difficulty)}</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={14} className="text-orange-400" />
                      <span className="text-orange-400">{quest.deadline}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {quest.status !== 'completed' && (
                <button 
                  onClick={() => completeQuest(quest.id)}
                  disabled={syncing}
                  className="bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-400 p-3 rounded-2xl border border-green-500/30 transition-all"
                >
                  {syncing ? <Loader className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                </button>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="text-gray-400">Yêu cầu: </span>
                  <span className="text-blue-400 font-medium">{quest.requiredStat}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">Danh mục: </span>
                  <span className="text-purple-400 font-medium capitalize">{quest.category}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-green-400 font-bold">+{quest.rewardExp} EXP</div>
                <div className="text-xs text-gray-400">{quest.rewardStat}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
);

const renderResources = () => (
<div className="space-y-6 px-4 pb-6">
<div>
<h2 className="text-xl font-bold text-white mb-2">💎 Nguồn vốn phát triển</h2>
<p className="text-sm text-gray-400">4 khía cạnh cốt lõi cho sự phát triển toàn diện</p>
</div>

  <div className="space-y-5">
    {resources.map((resource, index) => {
      const ResourceIcon = resource.icon;
      const details = resourceDetails[resource.name] || [];
      const activeDetails = details.filter(d => d.status === 'active');
      const totalValue = getResourceTotal(resource.name);
      
      return (
        <div key={index} className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center space-x-4 mb-5">
            <div className={`w-14 h-14 bg-gradient-to-br ${resource.color} rounded-2xl flex items-center justify-center shadow-lg`}>
              <ResourceIcon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{resource.name}</h3>
              <p className="text-gray-300 text-sm">{resource.description}</p>
              {totalValue > 0 && (
                <p className={`text-sm font-medium ${resource.textColor} mt-1`}>
                  Tổng giá trị: {formatCurrency(totalValue)} VND
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">Lv.{resource.level}</div>
              <div className={`text-xs ${resource.textColor}`}>Cấp độ</div>
            </div>
          </div>
          
          <div className="mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Tiến độ đến level tiếp theo</span>
              <span className="text-gray-400">{resource.progress}%</span>
            </div>
            <div className="w-full bg-gray-800/50 rounded-full h-3 relative overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-700 bg-gradient-to-r ${resource.color} relative`}
                style={{ width: `${Math.min(100, resource.progress)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>

          {/* Resource Details Section */}
          <div className="border-t border-gray-700/50 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Chi tiết ({activeDetails.length})</h4>
              <button
                onClick={() => {
                  setSelectedResource(resource.name);
                  setResourceForm({ id: null, name: '', amount: '', type: 'asset', notes: '' });
                  setShowResourceModal(true);
                }}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 p-2 rounded-xl border border-blue-500/30 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            {activeDetails.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-gray-500 text-sm">Chưa có chi tiết nào</div>
                <button
                  onClick={() => {
                    setSelectedResource(resource.name);
                    setResourceForm({ id: null, name: '', amount: '', type: 'asset', notes: '' });
                    setShowResourceModal(true);
                  }}
                  className="text-blue-400 text-sm hover:underline mt-1"
                >
                  Thêm chi tiết đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeDetails.map(detail => (
                  <div key={detail.id} className="bg-gray-800/30 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getTypeIcon(detail.type)}</span>
                      <div>
                        <div className="text-white text-sm font-medium">{detail.name}</div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className={getTypeColor(detail.type)}>
                            {formatCurrency(detail.amount)} VND
                          </span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400 capitalize">{detail.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setSelectedResource(resource.name);
                          setResourceForm({
                            id: detail.id,
                            name: detail.name,
                            amount: detail.amount.toString(),
                            type: detail.type,
                            notes: detail.notes
                          });
                          setShowResourceModal(true);
                        }}
                        className="text-gray-400 hover:text-blue-400 p-1"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteResourceDetail(resource.name, detail.id)}
                        className="text-gray-400 hover:text-red-400 p-1"
                        disabled={syncing}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-sm mt-4 pt-3 border-t border-gray-700/50">
            <div>
              <span className="text-gray-400">Nhiệm vụ liên quan: </span>
              <span className="text-white font-medium">{resource.relatedQuests || 0}</span>
            </div>
            {resource.nextMilestone && (
              <div className={`${resource.textColor} text-xs bg-gray-800/50 px-3 py-1 rounded-full`}>
                Mốc tiếp: {resource.nextMilestone}
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>

  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50">
    <h3 className="text-lg font-bold text-white mb-4">📋 Hướng dẫn cập nhật</h3>
    <div className="text-sm text-gray-300 space-y-2">
      <p>Dữ liệu chi tiết nguồn vốn được lưu trong Google Sheets tab 'ResourceDetails':</p>
      <div className="bg-gray-800/50 rounded-lg p-3 text-xs font-mono">
        <div>ResourceName | DetailName | Amount | Type | Notes | Date | Status</div>
        <div className="text-gray-400 mt-1">Tài chính | Bản thân | 50000000 | asset | Tiền tiết kiệm | 24/06/2025 | active</div>
        <div className="text-gray-400">Tài chính | Ba | 35000000 | asset | Hỗ trợ gia đình | 24/06/2025 | active</div>
      </div>
      <div className="text-xs text-gray-400 mt-2">
        <strong>Types:</strong> asset (tài sản), loan (khoản vay), investment (đầu tư), income (thu nhập), expense (chi phí)
      </div>
    </div>
  </div>
</div>
);

const renderAchievements = () => (
<div className="space-y-6 px-4 pb-6">
<div>
<h2 className="text-xl font-bold text-white mb-2">🏆 Danh hiệu & Thành tựu</h2>
<p className="text-sm text-gray-400">
{achievements.filter(a => a.unlocked).length}/{achievements.length} đã mở khóa
</p>
</div>

  {achievements.length === 0 ? (
    <EmptyState
      icon={Trophy}
      title="Chưa có danh hiệu nào"
      description="Thêm danh hiệu trong Google Sheets tab 'Achievements' với cấu trúc: Title | Description | Icon | Tier | Unlocked | UnlockedDate | Progress | Condition | Category"
      action={
        <div className="space-y-3">
          <button
            onClick={() => setShowSettings(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
          >
            Cài đặt Google Sheets
          </button>
          <div className="text-xs text-gray-500">
            Ví dụ: "First Steps | Hoàn thành nhiệm vụ đầu tiên | 🎯 | bronze | TRUE | 20/06/2025 | 100 | Complete 1 quest | general"
          </div>
        </div>
      }
    />
  ) : (
    <>
      {/* Achievement Stats */}
      <div className="grid grid-cols-4 gap-3">
        {['bronze', 'silver', 'gold', 'legendary'].map(tier => (
          <div key={tier} className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-2xl p-4 text-center border border-gray-700/50">
            <div className={`text-lg font-bold ${getTierColor(tier)}`}>
              {achievements.filter(a => a.tier === tier && a.unlocked).length}
            </div>
            <div className="text-xs text-gray-400 capitalize">{tier}</div>
          </div>
        ))}
      </div>
      
      <div className="space-y-4">
        {achievements.map(achievement => (
          <div 
            key={achievement.id} 
            className={`bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border transition-all ${
              achievement.unlocked 
                ? 'border-yellow-500/30 shadow-lg shadow-yellow-500/10' 
                : 'border-gray-700/50'
            } ${achievement.unlocked ? '' : 'opacity-70'}`}
          >
            <div className="flex items-center space-x-4">
              <div className={`text-4xl ${achievement.unlocked ? '' : 'grayscale'}`}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${getTierColor(achievement.tier)}`}>
                  {achievement.title}
                </h3>
                <p className="text-gray-300 text-sm mb-2">{achievement.description}</p>
                {achievement.unlocked ? (
                  <div className="text-xs text-green-400 flex items-center space-x-1">
                    <Award size={12} />
                    <span>Đạt được vào {achievement.unlockedDate}</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    <div className="flex justify-between mb-1">
                      <span>Tiến độ:</span>
                      <span>{achievement.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, achievement.progress)}%` }}
                      />
                    </div>
                    {achievement.condition && (
                      <div className="text-gray-500 mt-1">Điều kiện: {achievement.condition}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</div>
);

const renderSettings = () => (
<div className="space-y-6 px-4 pb-6">
<div>
<h2 className="text-xl font-bold text-white mb-2">⚙️ Cài đặt</h2>
<p className="text-sm text-gray-400">Kết nối và đồng bộ với Google Sheets</p>
</div>

  {/* Connection Status */}
  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-white">📊 Trạng thái kết nối</h3>
      <ConnectionIndicator />
    </div>
    
    {lastSync && (
      <p className="text-sm text-gray-400 mb-4">
        Đồng bộ lần cuối: {lastSync.toLocaleString('vi-VN')}
      </p>
    )}
    
    <div className="flex flex-wrap gap-3">
      <button
        onClick={() => testConnection()}
        disabled={loading || !settings.sheetId || !settings.apiKey}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
      >
        {loading ? <Loader className="animate-spin" size={16} /> : <Link size={16} />}
        <span>Kiểm tra kết nối</span>
      </button>
      
      <button
        onClick={syncFromSheets}
        disabled={syncing || !isConnected}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
      >
        {syncing ? <Loader className="animate-spin" size={16} /> : <RefreshCw size={16} />}
        <span>Đồng bộ ngay</span>
      </button>
      
      <button
        onClick={saveSettings}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors"
      >
        <Save size={16} />
        <span>Lưu cài đặt</span>
      </button>
    </div>
  </div>

  {/* Google Sheets Config */}
  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50">
    <h3 className="text-lg font-bold text-white mb-4">🔗 Cấu hình Google Sheets</h3>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Google Sheet ID *
        </label>
        <input
          type="text"
          value={settings.sheetId}
          onChange={(e) => setSettings(prev => ({ ...prev, sheetId: e.target.value }))}
          className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
        />
        <p className="text-xs text-gray-500 mt-1">
          Lấy từ URL: docs.google.com/spreadsheets/d/<strong>[SHEET_ID]</strong>/edit
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Google Sheets API Key *
        </label>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
          className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
          placeholder="AIzaSyD..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Tạo API Key tại <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>
        </p>
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <label className="text-sm font-medium text-gray-300">Tự động đồng bộ</label>
          <p className="text-xs text-gray-500">Đồng bộ định kỳ với Google Sheets</p>
        </div>
        <button
          onClick={() => setSettings(prev => ({ ...prev, autoSync: !prev.autoSync }))}
          className={`w-12 h-6 rounded-full transition-colors ${
            settings.autoSync ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            settings.autoSync ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {settings.autoSync && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tần suất đồng bộ
          </label>
          <select
            value={settings.syncInterval}
            onChange={(e) => setSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
            className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value={1}>Mỗi 1 phút</option>
            <option value={5}>Mỗi 5 phút</option>
            <option value={15}>Mỗi 15 phút</option>
            <option value={30}>Mỗi 30 phút</option>
            <option value={60}>Mỗi 1 giờ</option>
          </select>
        </div>
      )}
    </div>
  </div>

  {/* Setup Guide */}
  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50">
    <h3 className="text-lg font-bold text-white mb-4">📋 Hướng dẫn thiết lập</h3>
    <div className="space-y-4 text-sm text-gray-300">
      <div className="flex items-start space-x-3">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold mt-0.5 flex-shrink-0">1</div>
        <div>
          <p className="font-medium text-white">Tạo Google Sheet mới</p>
          <p className="text-gray-400">Tạo các sheet tabs: Character, Quests, Achievements, Goals, Resources, ResourceDetails, Chat</p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold mt-0.5 flex-shrink-0">2</div>
        <div>
          <p className="font-medium text-white">Lấy API Key</p>
          <p className="text-gray-400">Tại Google Cloud Console, bật Google Sheets API và tạo API Key</p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold mt-0.5 flex-shrink-0">3</div>
        <div>
          <p className="font-medium text-white">Chia sẻ Sheet</p>
          <p className="text-gray-400">Đặt quyền "Anyone with the link can view" hoặc "edit"</p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold mt-0.5 flex-shrink-0">4</div>
        <div>
          <p className="font-medium text-white">Nhập thông tin</p>
          <p className="text-gray-400">Điền Sheet ID và API Key vào form trên, sau đó nhấn "Lưu cài đặt"</p>
        </div>
      </div>
    </div>
  </div>

  {/* Sheet Structure Guide */}
  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-3xl p-6 border border-gray-700/50">
    <h3 className="text-lg font-bold text-white mb-4">📊 Cấu trúc dữ liệu</h3>
    <div className="space-y-3 text-xs">
      <div>
        <p className="font-medium text-white mb-1">Sheet "Quests" (A2:J):</p>
        <div className="bg-gray-800/50 rounded p-2 font-mono text-gray-300">
          Title | Description | RequiredStat | Difficulty | Deadline | RewardEXP | RewardStat | Status | Category | Priority
        </div>
      </div>
      <div>
        <p className="font-medium text-white mb-1">Sheet "Achievements" (A2:I):</p>
        <div className="bg-gray-800/50 rounded p-2 font-mono text-gray-300">
          Title | Description | Icon | Tier | Unlocked | UnlockedDate | Progress | Condition | Category
        </div>
      </div>
      <div>
        <p className="font-medium text-white mb-1">Sheet "ResourceDetails" (A2:G):</p>
        <div className="bg-gray-800/50 rounded p-2 font-mono text-gray-300">
          ResourceName | DetailName | Amount | Type | Notes | Date | Status
        </div>
      </div>
      <div>
        <p className="font-medium text-white mb-1">Sheet "Character" (A1:B):</p>
        <div className="bg-gray-800/50 rounded p-2 font-mono text-gray-300">
          name | Hero<br/>avatar | https://example.com/avatar.jpg<br/>birthYear | 1995<br/>level | 5<br/>exp | 750<br/>expToNext | 1000<br/>stats | {"{WILL:15,PHY:12,...}"}
        </div>
      </div>
    </div>
  </div>
</div>
);

const renderContent = () => {
if (showSettings) return renderSettings();

switch(activeTab) {
  case 'dashboard': return renderDashboard();
  case 'character': return renderCharacter();
  case 'quests': return renderQuests();
  case 'resources': return renderResources();
  case 'achievements': return renderAchievements();
  default: return renderDashboard();
}
};

return (
<div className="min-h-screen bg-black text-white pb-24 relative overflow-hidden">
<div className="fixed inset-0 bg-gradient-to-b from-indigo-950/20 via-black to-black pointer-events-none" />

  {/* Status Messages */}
  <StatusMessage />
  
  {/* Header */}
  <header className="bg-gray-900/95 backdrop-blur-lg px-4 py-4 sticky top-0 z-50 border-b border-gray-800/50">
    <div className="flex items-center justify-between pt-2">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold">⚡</span>
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Level Up
          </h1>
          <div className="text-xs text-gray-400">RPG Self-Development</div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <ConnectionIndicator />
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-blue-600' : 'bg-gray-800/50 hover:bg-gray-700/50'}`}
        >
          <Settings size={18} className={showSettings ? 'text-white' : 'text-gray-400'} />
        </button>
      </div>
    </div>
  </header>

  {/* Main Content */}
  <main className="relative z-10">
    {renderContent()}
  </main>

  {/* Bottom Navigation */}
  <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800/50 px-4 pb-8 pt-3 z-50">
    <div className="flex justify-around">
      {navItems.map(item => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setShowSettings(false);
            }}
            className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-all ${
              activeTab === item.id && !showSettings
                ? 'bg-blue-600 text-white scale-105' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <IconComponent size={22} className="mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
    <div className="w-36 h-1 bg-white/30 rounded-full mx-auto mt-2" />
  </nav>

  {/* Floating Chat Button */}
  <button
    onClick={() => setShowChat(true)}
    className="fixed bottom-28 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 z-40 border-2 border-white/10"
  >
    <MessageCircle size={26} className="text-white" />
  </button>

  {/* Resource Detail Modal */}
  {showResourceModal && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/95 backdrop-blur-lg rounded-3xl border border-gray-700/50 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h3 className="font-bold text-white text-lg">
              {resourceForm.id ? 'Chỉnh sửa' : 'Thêm'} chi tiết
            </h3>
            <p className="text-sm text-gray-400">{selectedResource}</p>
          </div>
          <button 
            onClick={() => setShowResourceModal(false)}
            className="text-gray-400 hover:text-white p-2 bg-gray-800/50 rounded-xl transition-colors"
          >
            <X size={22} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tên chi tiết *
            </label>
            <input
              type="text"
              value={resourceForm.name}
              onChange={(e) => setResourceForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="VD: Bản thân, Ba, Mượn mẹ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Số tiền (VND) *
            </label>
            <input
              type="number"
              value={resourceForm.amount}
              onChange={(e) => setResourceForm(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="50000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Loại *
            </label>
            <select
              value={resourceForm.type}
              onChange={(e) => setResourceForm(prev => ({ ...prev, type: e.target.value }))}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="asset">💰 Tài sản</option>
              <option value="loan">📋 Khoản vay</option>
              <option value="investment">📈 Đầu tư</option>
              <option value="income">💸 Thu nhập</option>
              <option value="expense">💳 Chi phí</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ghi chú
            </label>
            <textarea
              value={resourceForm.notes}
              onChange={(e) => setResourceForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors resize-none"
              rows={3}
              placeholder="Mô tả chi tiết về nguồn vốn này..."
            />
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
          <div className="flex space-x-3">
            <button
              onClick={() => setShowResourceModal(false)}
              className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white py-3 rounded-2xl font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleResourceFormSubmit}
              disabled={syncing || !resourceForm.name || !resourceForm.amount}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-2xl font-medium transition-colors"
            >
              {syncing ? <Loader className="animate-spin mx-auto" size={16} /> : (resourceForm.id ? 'Cập nhật' : 'Thêm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Character Edit Modal */}
  {showCharacterModal && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/95 backdrop-blur-lg rounded-3xl border border-gray-700/50 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h3 className="font-bold text-white text-lg">✏️ Chỉnh sửa nhân vật</h3>
            <p className="text-sm text-gray-400">Cập nhật thông tin cá nhân</p>
          </div>
          <button 
            onClick={() => setShowCharacterModal(false)}
            className="text-gray-400 hover:text-white p-2 bg-gray-800/50 rounded-xl transition-colors"
          >
            <X size={22} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg overflow-hidden">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center ${avatarPreview ? 'hidden' : ''}`}>
                🧙‍♂️
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm cursor-pointer transition-colors inline-block">
                  📷 Tải ảnh lên
                </div>
              </label>
              
              <div className="text-xs text-gray-400">hoặc</div>
              
              <input
                type="url"
                placeholder="Dán link ảnh từ internet..."
                onChange={(e) => handleAvatarUrl(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>

          {/* Name Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tên nhân vật *
            </label>
            <input
              type="text"
              value={characterForm.name}
              onChange={(e) => setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Nhập tên nhân vật..."
              maxLength={50}
            />
            <div className="text-xs text-gray-500 mt-1">
              {characterForm.name.length}/50 ký tự
            </div>
          </div>

          {/* Birth Year Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Năm sinh
            </label>
            <input
              type="number"
              value={characterForm.birthYear}
              onChange={(e) => setCharacterForm(prev => ({ ...prev, birthYear: e.target.value }))}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="VD: 1995"
              min="1900"
              max={new Date().getFullYear()}
            />
            <div className="text-xs text-gray-500 mt-1">
              {characterForm.birthYear && !isNaN(parseInt(characterForm.birthYear)) && (
                <span className="text-blue-400">
                  Tuổi hiện tại: {calculateAge(parseInt(characterForm.birthYear)) || 0}
                </span>
              )}
              {!characterForm.birthYear && "Tùy chọn - để trống nếu không muốn hiển thị tuổi"}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowCharacterModal(false);
                setCharacterForm({ name: '', avatar: '', birthYear: '' });
                setAvatarPreview('');
              }}
              className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white py-3 rounded-2xl font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleCharacterFormSubmit}
              disabled={syncing || !characterForm.name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-2xl font-medium transition-colors"
            >
              {syncing ? <Loader className="animate-spin mx-auto" size={16} /> : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Chat Modal */}
  {showChat && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end">
      <div className="w-full h-[75vh] bg-gray-900/95 backdrop-blur-lg rounded-t-3xl border-t border-gray-700/50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h3 className="font-bold text-white text-lg">💬 Ghi chú & Suy nghĩ</h3>
            <p className="text-sm text-gray-400">Không gian riêng tư của bạn</p>
          </div>
          <button 
            onClick={() => setShowChat(false)}
            className="text-gray-400 hover:text-white p-2 bg-gray-800/50 rounded-xl transition-colors"
          >
            <X size={22} />
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chatMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Chưa có ghi chú nào</p>
              <p className="text-sm text-gray-500">Hãy chia sẻ suy nghĩ của bạn</p>
            </div>
          ) : (
            chatMessages.map(message => (
              <div key={message.id} className="bg-gray-800/50 rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <span className="text-lg">
                    {message.type === 'achievement' ? '🎉' : message.type === 'reminder' ? '⏰' : '💭'}
                  </span>
                  <div className="flex-1">
                    <div className="text-white text-sm leading-relaxed">{message.text}</div>
                    <div className="text-xs text-gray-400 mt-2">{message.timestamp}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700/50 bg-gray-800/30 pb-8">
          <div className="flex space-x-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Chia sẻ suy nghĩ của bạn..."
              className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-2xl px-5 py-4 text-white text-sm placeholder-gray-400 backdrop-blur-sm focus:border-blue-500 focus:outline-none transition-colors"
            />
            <button
              onClick={sendChatMessage}
              disabled={syncing || !chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-2xl font-medium shadow-lg transition-colors"
            >
              {syncing ? <Loader className="animate-spin" size={16} /> : 'Gửi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
);
};

// Main App Component
function App() {
  return <LevelUpApp />;
}

export default App;