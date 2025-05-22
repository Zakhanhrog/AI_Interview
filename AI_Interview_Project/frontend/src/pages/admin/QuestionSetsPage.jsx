import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import axios from 'axios';

const DEFAULT_CONFIG_ID = "default_question_set_config"; // ID cố định cho document config

function QuestionSetsPage() {
  const [questionSets, setQuestionSets] = useState([]);
  const [defaultConfig, setDefaultConfig] = useState({
    default_general_qset_id_name: null,
    default_developer_qset_id_name: null,
    default_designer_qset_id_name: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [editingSet, setEditingSet] = useState(null);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);

  const [newSetIdName, setNewSetIdName] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [newSetQuestionsJson, setNewSetQuestionsJson] = useState(
    '[\n  {\n    "text": "Câu hỏi mẫu 1?",\n    "order": 1\n  },\n  {\n    "text": "Câu hỏi mẫu 2?",\n    "order": 2\n  }\n]'
  );
  const [newSetFieldType, setNewSetFieldType] = useState('none');

  const displaySuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3500);
  };
  const displayErrorMessage = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const fetchQuestionSets = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.get('/admin/question-sets');
      setQuestionSets(response.data);
      setError('');
    } catch (err) {
      let errMsg = 'Không thể tải danh sách bộ câu hỏi. ';
      if (axios.isAxiosError(err) && err.response) {
         errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
      } else {
         errMsg += err.message || 'Lỗi không xác định';
      }
      displayErrorMessage(errMsg);
      console.error("Error fetching question sets:", err);
    }
    setIsLoading(false);
  };

  const fetchDefaultConfig = async () => {
    setConfigLoading(true);
    try {
      const response = await adminApi.get('/admin/question-sets/default-config');
      setDefaultConfig(response.data);
    } catch (err) {
      let errMsg = 'Không thể tải cấu hình bộ câu hỏi mặc định. ';
      if (axios.isAxiosError(err) && err.response) {
         errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
      } else {
         errMsg += err.message || 'Lỗi không xác định';
      }
      displayErrorMessage(errMsg); // Hiển thị lỗi ở message chung, có thể cần vị trí khác
      console.error("Error fetching default config:", err);
    }
    setConfigLoading(false);
  };


  useEffect(() => {
    fetchQuestionSets();
    fetchDefaultConfig();
  }, []);

  const handleAddSet = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const questionsArray = JSON.parse(newSetQuestionsJson);
      const payload = {
        id_name: newSetIdName.trim() || undefined,
        name: newSetName.trim(),
        questions: questionsArray,
        field_type: newSetFieldType,
      };

      if (!payload.name) {
          displayErrorMessage("Tên bộ câu hỏi không được để trống.");
          setActionLoading(false);
          return;
      }

      await adminApi.post('/admin/question-sets', payload);
      
      setNewSetIdName('');
      setNewSetName('');
      setNewSetQuestionsJson(
        '[\n  {\n    "text": "Câu hỏi mẫu 1?",\n    "order": 1\n  },\n  {\n    "text": "Câu hỏi mẫu 2?",\n    "order": 2\n  }\n]'
      );
      setNewSetFieldType('none');
      
      await fetchQuestionSets();
      displaySuccessMessage('Thêm bộ câu hỏi thành công!');
    } catch (err) {
      let errMsg = 'Lỗi khi thêm bộ câu hỏi. ';
      if (err instanceof SyntaxError) {
         errMsg += 'Lỗi cú pháp JSON trong dữ liệu câu hỏi.';
      } else if (axios.isAxiosError(err) && err.response) { 
         errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
      } else {
         errMsg += err.message || 'Lỗi không xác định khi thêm bộ câu hỏi.';
      }
      displayErrorMessage(errMsg);
      console.error("Error adding question set:", err);
    }
    setActionLoading(false);
  };
  
  const handleDeleteSet = async (idNameToDelete) => {
    if (defaultConfig.default_general_qset_id_name === idNameToDelete ||
        defaultConfig.default_developer_qset_id_name === idNameToDelete ||
        defaultConfig.default_designer_qset_id_name === idNameToDelete) {
        displayErrorMessage(`Không thể xóa bộ câu hỏi "${idNameToDelete}" vì nó đang được đặt làm mặc định. Vui lòng thay đổi cấu hình mặc định trước.`);
        return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa bộ câu hỏi "${idNameToDelete}" không? Hành động này không thể hoàn tác.`)) {
        return;
    }
    setActionLoading(true);
    try {
        await adminApi.delete(`/admin/question-sets/${idNameToDelete}`);
        await fetchQuestionSets();
        displaySuccessMessage(`Xóa bộ câu hỏi "${idNameToDelete}" thành công!`);
    } catch (err) {
        let errMsg = `Lỗi khi xóa bộ câu hỏi "${idNameToDelete}". `;
        if (axios.isAxiosError(err) && err.response) {
            errMsg += err.response.data?.detail || err.message;
        } else {
            errMsg += err.message || 'Lỗi không xác định.';
        }
        displayErrorMessage(errMsg);
        console.error("Error deleting question set:", err);
    }
    setActionLoading(false);
  };

  const handleSetDefault = async (qSetToSetDefault, typeToSet) => {
    const qSet = questionSets.find(qs => qs.id_name === qSetToSetDefault.id_name);
    if (!qSet) return;

    let typeNameForConfirm = "";
    let payloadKey = "";
    let currentDefaultIdName = null;

    if (typeToSet === 'general') {
        if (qSet.field_type !== 'none') {
            displayErrorMessage("Chỉ bộ câu hỏi loại 'Chung/Kỹ năng mềm' mới có thể đặt làm mặc định cho mục Chung.");
            return;
        }
        typeNameForConfirm = "Chung";
        payloadKey = "default_general_qset_id_name";
        currentDefaultIdName = defaultConfig.default_general_qset_id_name;
    } else if (typeToSet === 'developer') {
        if (qSet.field_type !== 'developer') {
            displayErrorMessage("Chỉ bộ câu hỏi loại 'Developer' mới có thể đặt làm mặc định cho mục Developer.");
            return;
        }
        typeNameForConfirm = "Developer";
        payloadKey = "default_developer_qset_id_name";
        currentDefaultIdName = defaultConfig.default_developer_qset_id_name;
    } else if (typeToSet === 'designer') {
         if (qSet.field_type !== 'designer') {
            displayErrorMessage("Chỉ bộ câu hỏi loại 'Designer' mới có thể đặt làm mặc định cho mục Designer.");
            return;
        }
        typeNameForConfirm = "Designer";
        payloadKey = "default_designer_qset_id_name";
        currentDefaultIdName = defaultConfig.default_designer_qset_id_name;
    } else {
        return; // Should not happen
    }
    
    if (currentDefaultIdName === qSet.id_name) {
        displaySuccessMessage(`"${qSet.name}" (${qSet.id_name}) đã là bộ câu hỏi mặc định cho mục ${typeNameForConfirm}.`);
        return;
    }

    if (!window.confirm(`Bạn có muốn đặt bộ câu hỏi "${qSet.name}" (${qSet.id_name}) làm bộ câu hỏi mặc định cho mục ${typeNameForConfirm} không?`)) {
        return;
    }

    setActionLoading(true);
    try {
        const newConfigPayload = {
            ...defaultConfig, // giữ lại các config cũ
            _id: DEFAULT_CONFIG_ID, // Đảm bảo _id được gửi đúng
            id: DEFAULT_CONFIG_ID, // API có thể mong đợi id hoặc _id, gửi cả hai cho chắc
            [payloadKey]: qSet.id_name, // cập nhật id_name mới
        };
        // Loại bỏ trường không cần thiết mà backend có thể không mong muốn nếu có
        if(newConfigPayload.updated_at) delete newConfigPayload.updated_at; 


        await adminApi.put(`/admin/question-sets/default-config`, newConfigPayload);
        await fetchDefaultConfig(); // Tải lại config
        // Không cần fetchQuestionSets() vì danh sách bộ câu hỏi không đổi
        displaySuccessMessage(`Đã đặt "${qSet.name}" (${qSet.id_name}) làm bộ câu hỏi mặc định cho mục ${typeNameForConfirm}.`);
    } catch (err) {
        let errMsg = `Lỗi khi đặt bộ câu hỏi "${qSet.name}" làm mặc định. `;
        if (axios.isAxiosError(err) && err.response) {
            errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
        } else {
            errMsg += err.message || 'Lỗi không xác định.';
        }
        displayErrorMessage(errMsg);
        console.error("Error setting default question set:", err);
    }
    setActionLoading(false);
  };


  const openEditModal = (qSet) => {
    setEditingSet({
        id_name: qSet.id_name,
        name: qSet.name,
        questionsJson: JSON.stringify(qSet.questions, null, 2),
        field_type: qSet.field_type,
        // is_default_general không còn nữa
    });
    setEditModalIsOpen(true);
  };

  const handleUpdateSet = async (e) => {
    e.preventDefault();
    if (!editingSet) return;
    setActionLoading(true);
    try {
        const questionsArray = JSON.parse(editingSet.questionsJson);
        const payload = { 
            name: editingSet.name.trim(),
            questions: questionsArray,
            field_type: editingSet.field_type,
            // is_default_general không còn nữa
        };
        if (!payload.name) {
            displayErrorMessage("Tên bộ câu hỏi không được để trống khi cập nhật.");
            setActionLoading(false);
            return;
        }
        await adminApi.put(`/admin/question-sets/${editingSet.id_name}`, payload);
        setEditModalIsOpen(false);
        setEditingSet(null);
        await fetchQuestionSets();
        displaySuccessMessage(`Cập nhật bộ câu hỏi "${editingSet.id_name}" thành công!`);
    } catch (err) {
        let errMsg = `Lỗi khi cập nhật bộ câu hỏi "${editingSet.id_name}". `;
        if (err instanceof SyntaxError) {
            errMsg += 'Lỗi cú pháp JSON trong dữ liệu câu hỏi.';
        } else if (axios.isAxiosError(err) && err.response) {
            errMsg += err.response.data?.detail || err.message;
        } else {
            errMsg += err.message || 'Lỗi không xác định.';
        }
        setEditingSet(prev => ({...prev, modalError: errMsg}));
        console.error("Error updating question set:", err);
    }
    setActionLoading(false);
  };

  const getFieldTypeName = (fieldType) => {
    switch (fieldType) {
        case 'developer': return 'Developer';
        case 'designer': return 'Designer';
        case 'none': return 'Chung/Kỹ năng mềm';
        default: return fieldType;
    }
  };

  const isDefaultFor = (qSetIdName, type) => {
    if (!defaultConfig) return false;
    if (type === 'general') return defaultConfig.default_general_qset_id_name === qSetIdName;
    if (type === 'developer') return defaultConfig.default_developer_qset_id_name === qSetIdName;
    if (type === 'designer') return defaultConfig.default_designer_qset_id_name === qSetIdName;
    return false;
  };


  return (
    <div>
      <h1>Quản lý Bộ Câu Hỏi</h1>
      {error && <p className="error-message admin-message-box admin-message-error">{error}</p>}
      {successMessage && <p className="success-message admin-message-box admin-message-success">{successMessage}</p>}

      <div className="admin-section-card">
        <h2>Thêm Bộ Câu Hỏi Mới</h2>
        <form onSubmit={handleAddSet}>
            <div className="admin-form-group">
            <label htmlFor="newSetIdName">ID định danh (tùy chọn, nếu bỏ trống sẽ tự sinh theo loại):</label>
            <input type="text" id="newSetIdName" value={newSetIdName} onChange={(e) => setNewSetIdName(e.target.value)} placeholder="Ví dụ: soft_skills_v2"/>
            </div>
            <div className="admin-form-group">
            <label htmlFor="newSetName">Tên bộ câu hỏi:</label>
            <input type="text" id="newSetName" value={newSetName} onChange={(e) => setNewSetName(e.target.value)} required placeholder="Ví dụ: Bộ câu hỏi JavaScript Nâng cao"/>
            </div>
            <div className="admin-form-group">
                <label htmlFor="newSetFieldType">Loại bộ câu hỏi:</label>
                <select id="newSetFieldType" value={newSetFieldType} onChange={(e) => setNewSetFieldType(e.target.value)}>
                    <option value="none">Chung / Kỹ năng mềm</option>
                    <option value="developer">Developer</option>
                    <option value="designer">Designer</option>
                </select>
            </div>
            <div className="admin-form-group">
            <label htmlFor="newSetQuestionsJson">Các câu hỏi (định dạng JSON):</label>
            <textarea id="newSetQuestionsJson" value={newSetQuestionsJson} onChange={(e) => setNewSetQuestionsJson(e.target.value)} rows={8} style={{ fontFamily: 'monospace', fontSize: '0.9em' }} required placeholder='[{"text": "Câu hỏi 1?", "order": 1}]'/>
            <small>Mỗi câu hỏi: {"{\"text\": \"Nội dung?\", \"order\": 1 }"}</small>
            </div>
            <button type="submit" disabled={actionLoading} className="admin-button">
            {actionLoading ? 'Đang xử lý...' : 'Thêm Mới Bộ Câu Hỏi'}
            </button>
        </form>
      </div>

      <div className="admin-section-card" style={{marginTop: '30px'}}>
        <h2>Danh sách Các Bộ Câu Hỏi Hiện Có</h2>
        {isLoading && !questionSets.length && <p>Đang tải danh sách...</p>}
        {!isLoading && questionSets.length === 0 && !error && <p>Chưa có bộ câu hỏi nào trong hệ thống.</p>}
        {configLoading && <p>Đang tải cấu hình mặc định...</p>}
        
        {!isLoading && questionSets.length > 0 && !configLoading && (
            <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên</th>
                            <th>Loại</th>
                            <th>Số câu</th>
                            <th>Đặt làm mặc định</th>
                            <th style={{minWidth: '180px'}}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questionSets.map(qSet => (
                        <tr key={qSet.id_name}>
                            <td style={{wordBreak: 'break-all'}}>{qSet.id_name}</td>
                            <td>{qSet.name}</td>
                            <td>{getFieldTypeName(qSet.field_type)}</td>
                            <td>{qSet.questions ? qSet.questions.length : 0}</td>
                            <td>
                                {qSet.field_type === 'none' && (
                                    isDefaultFor(qSet.id_name, 'general') ? 
                                    (<span className="default-badge">Mặc định Chung ✓</span>) :
                                    (<button onClick={() => handleSetDefault(qSet, 'general')} disabled={actionLoading} className="admin-button admin-button-small admin-button-outline">
                                        Cho Chung
                                    </button>)
                                )}
                                {qSet.field_type === 'developer' && (
                                    isDefaultFor(qSet.id_name, 'developer') ? 
                                    (<span className="default-badge">Mặc định Dev ✓</span>) :
                                    (<button onClick={() => handleSetDefault(qSet, 'developer')} disabled={actionLoading} className="admin-button admin-button-small admin-button-outline">
                                        Cho Dev
                                    </button>)
                                )}
                                {qSet.field_type === 'designer' && (
                                    isDefaultFor(qSet.id_name, 'designer') ?
                                    (<span className="default-badge">Mặc định Design ✓</span>) :
                                    (<button onClick={() => handleSetDefault(qSet, 'designer')} disabled={actionLoading} className="admin-button admin-button-small admin-button-outline">
                                        Cho Design
                                    </button>)
                                )}
                            </td>
                            <td>
                                <button onClick={() => openEditModal(qSet)} disabled={actionLoading} className="admin-button admin-button-small" style={{marginRight: '8px'}}>
                                    Sửa
                                </button>
                                <button 
                                    onClick={() => handleDeleteSet(qSet.id_name)} 
                                    disabled={actionLoading || isDefaultFor(qSet.id_name, 'general') || isDefaultFor(qSet.id_name, 'developer') || isDefaultFor(qSet.id_name, 'designer')} 
                                    className="admin-button admin-button-small admin-button-danger"
                                    title={ (isDefaultFor(qSet.id_name, 'general') || isDefaultFor(qSet.id_name, 'developer') || isDefaultFor(qSet.id_name, 'designer')) ? "Không thể xóa bộ câu hỏi đang làm mặc định" : "Xóa bộ câu hỏi"}
                                >
                                    Xóa
                                </button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

        {editModalIsOpen && editingSet && (
            <div className="admin-modal-overlay" onClick={() => setEditModalIsOpen(false)}>
                <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2>Sửa Bộ Câu Hỏi: <span style={{fontWeight: 'normal'}}>{editingSet.id_name}</span></h2>
                    {editingSet.modalError && <p className="error-message admin-message-box admin-message-error">{editingSet.modalError}</p>}
                    <form onSubmit={handleUpdateSet}>
                        <div className="admin-form-group">
                            <label htmlFor="editSetName">Tên bộ câu hỏi:</label>
                            <input type="text" id="editSetName" value={editingSet.name} 
                                   onChange={(e) => setEditingSet({...editingSet, name: e.target.value, modalError: ''})} required />
                        </div>
                        <div className="admin-form-group">
                            <label htmlFor="editSetFieldType">Loại bộ câu hỏi:</label>
                            <select id="editSetFieldType" value={editingSet.field_type} 
                                    onChange={(e) => setEditingSet({...editingSet, field_type: e.target.value, modalError: ''})}>
                                <option value="none">Chung / Kỹ năng mềm</option>
                                <option value="developer">Developer</option>
                                <option value="designer">Designer</option>
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label htmlFor="editSetQuestionsJson">Các câu hỏi (JSON):</label>
                            <textarea id="editSetQuestionsJson" value={editingSet.questionsJson} 
                                      onChange={(e) => setEditingSet({...editingSet, questionsJson: e.target.value, modalError: ''})} 
                                      rows={10} style={{ fontFamily: 'monospace', fontSize: '0.9em' }} required />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button type="button" onClick={() => {setEditModalIsOpen(false); setEditingSet(null);}} disabled={actionLoading} className="admin-button admin-button-secondary">
                                Hủy
                            </button>
                            <button type="submit" disabled={actionLoading} className="admin-button">
                                {actionLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}

export default QuestionSetsPage;