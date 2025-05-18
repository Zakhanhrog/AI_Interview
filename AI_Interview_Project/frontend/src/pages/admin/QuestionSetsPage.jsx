// frontend/src/pages/admin/QuestionSetsPage.jsx
import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';
import axios from 'axios'; // Import axios để sử dụng axios.isAxiosError

function QuestionSetsPage() {
  const [questionSets, setQuestionSets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // Loading riêng cho các hành động (delete, set default, update)
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // State cho form Sửa
  const [editingSet, setEditingSet] = useState(null); // { id_name, name, questionsJson, field_type, is_default_general }
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);

  // State cho form Thêm mới
  const [newSetIdName, setNewSetIdName] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [newSetQuestionsJson, setNewSetQuestionsJson] = useState(
    '[\n  {\n    "text": "Câu hỏi mẫu 1?",\n    "order": 1\n  },\n  {\n    "text": "Câu hỏi mẫu 2?",\n    "order": 2\n  }\n]'
  );
  const [newSetFieldType, setNewSetFieldType] = useState('none');
  const [newSetIsDefaultGeneral, setNewSetIsDefaultGeneral] = useState(false);

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
    // Giữ lại lỗi cũ nếu có, chỉ xóa khi request thành công hoặc có lỗi mới
    // setError(''); 
    try {
      const response = await adminApi.get('/admin/question-sets');
      setQuestionSets(response.data);
      setError(''); // Xóa lỗi nếu tải thành công
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

  useEffect(() => {
    fetchQuestionSets();
  }, []);

  const handleAddSet = async (e) => {
    e.preventDefault();
    if (newSetIsDefaultGeneral && newSetFieldType !== 'none') {
        displayErrorMessage("Bộ câu hỏi mặc định chung phải có loại 'none'.");
        return;
    }
    setActionLoading(true); // Dùng actionLoading cho form submit
    // setError(''); 
    try {
      const questionsArray = JSON.parse(newSetQuestionsJson);
      const payload = {
        id_name: newSetIdName.trim() || undefined,
        name: newSetName.trim(),
        questions: questionsArray,
        field_type: newSetFieldType,
        is_default_general: newSetIsDefaultGeneral
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
      setNewSetIsDefaultGeneral(false);
      
      await fetchQuestionSets(); // Tải lại danh sách
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
    const qSetToDelete = questionSets.find(qs => qs.id_name === idNameToDelete);
    if (qSetToDelete && qSetToDelete.is_default_general && qSetToDelete.field_type === 'none') {
        const defaultGeneralCount = questionSets.filter(qs => qs.is_default_general && qs.field_type === 'none').length;
        if (defaultGeneralCount <= 1) {
            displayErrorMessage("Không thể xóa bộ câu hỏi chung mặc định duy nhất. Vui lòng đặt bộ khác làm mặc định trước.");
            return;
        }
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

  const handleSetDefaultGeneral = async (idNameToSetDefault) => {
    const qSet = questionSets.find(qs => qs.id_name === idNameToSetDefault);
    if (!qSet) return;

    if (qSet.field_type !== 'none') {
        displayErrorMessage("Chỉ có thể đặt bộ câu hỏi loại 'Chung/Kỹ năng mềm' làm mặc định.");
        return;
    }
    if (qSet.is_default_general) {
        displaySuccessMessage(`"${idNameToSetDefault}" đã là bộ câu hỏi chung mặc định.`);
        return;
    }
    if (!window.confirm(`Bạn có muốn đặt bộ câu hỏi "${qSet.name}" (${idNameToSetDefault}) làm bộ câu hỏi chung mặc định không?`)) {
        return;
    }
    setActionLoading(true);
    try {
        await adminApi.post(`/admin/question-sets/${idNameToSetDefault}/set-default-general`);
        await fetchQuestionSets(); 
        displaySuccessMessage(`Đã đặt "${idNameToSetDefault}" làm bộ câu hỏi chung mặc định.`);
    } catch (err) {
        let errMsg = `Lỗi khi đặt bộ câu hỏi "${idNameToSetDefault}" làm mặc định. `;
        if (axios.isAxiosError(err) && err.response) {
            errMsg += err.response.data?.detail || err.message;
        } else {
            errMsg += err.message || 'Lỗi không xác định.';
        }
        displayErrorMessage(errMsg);
        console.error("Error setting default general question set:", err);
    }
    setActionLoading(false);
  };

  const openEditModal = (qSet) => {
    setEditingSet({
        id_name: qSet.id_name, // Không cho sửa id_name
        name: qSet.name,
        questionsJson: JSON.stringify(qSet.questions, null, 2),
        field_type: qSet.field_type,
        is_default_general: qSet.is_default_general
    });
    setEditModalIsOpen(true);
  };

  const handleUpdateSet = async (e) => {
    e.preventDefault();
    if (!editingSet) return;

    if (editingSet.is_default_general && editingSet.field_type !== 'none') {
        displayErrorMessage("Khi cập nhật, bộ câu hỏi mặc định chung phải có loại 'none'.");
        // Hoặc tự động set field_type = 'none' nếu is_default_general là true
        // setEditingSet(prev => ({...prev, field_type: 'none'})); // Cần user confirm
        return;
    }
    setActionLoading(true);
    try {
        const questionsArray = JSON.parse(editingSet.questionsJson);
        const payload = { // Không gửi id_name trong payload update
            name: editingSet.name.trim(),
            questions: questionsArray,
            field_type: editingSet.field_type,
            is_default_general: editingSet.is_default_general
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
        // Giữ modal mở và hiển thị lỗi bên trong modal hoặc ngay trên modal
        // displayErrorMessage(errMsg); // Để hiển thị lỗi ở message chung
        setEditingSet(prev => ({...prev, modalError: errMsg})); // Hoặc thêm state lỗi cho modal
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

  return (
    <div>
      <h1>Quản lý Bộ Câu Hỏi</h1>
      {error && <p className="error-message admin-message-box admin-message-error">{error}</p>}
      {successMessage && <p className="success-message admin-message-box admin-message-success">{successMessage}</p>}

      <div className="admin-section-card"> {/* Bọc form thêm mới trong card */}
        <h2>Thêm Bộ Câu Hỏi Mới</h2>
        <form onSubmit={handleAddSet}>
            <div className="admin-form-group">
            <label htmlFor="newSetIdName">ID định danh (tùy chọn, nếu bỏ trống sẽ tự sinh):</label>
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
            <div className="admin-form-group admin-form-checkbox-group">
                <input type="checkbox" id="newSetIsDefaultGeneral" checked={newSetIsDefaultGeneral} onChange={(e) => setNewSetIsDefaultGeneral(e.target.checked)} />
                <label htmlFor="newSetIsDefaultGeneral">Đặt làm bộ câu hỏi chung mặc định khi bắt đầu phỏng vấn?</label>
            </div>
            <div className="admin-form-group">
            <label htmlFor="newSetQuestionsJson">Các câu hỏi (định dạng JSON):</label>
            <textarea id="newSetQuestionsJson" value={newSetQuestionsJson} onChange={(e) => setNewSetQuestionsJson(e.target.value)} rows={8} style={{ fontFamily: 'monospace', fontSize: '0.9em' }} required placeholder='[{"text": "Câu hỏi 1?", "order": 1}]'/>
            <small>Mỗi câu hỏi: {"{\"text\": \"Nội dung?\", \"order\": 1 }"}</small>
            </div>
            <button type="submit" disabled={actionLoading} className="admin-button">
            {actionLoading && (isLoading || newSetIdName) ? 'Đang xử lý...' : 'Thêm Mới Bộ Câu Hỏi'}
            </button>
        </form>
      </div>

      <div className="admin-section-card" style={{marginTop: '30px'}}> {/* Bọc danh sách trong card */}
        <h2>Danh sách Các Bộ Câu Hỏi Hiện Có</h2>
        {isLoading && !questionSets.length && <p>Đang tải danh sách...</p>}
        {!isLoading && questionSets.length === 0 && !error && <p>Chưa có bộ câu hỏi nào trong hệ thống.</p>}
        
        {!isLoading && questionSets.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên</th>
                            <th>Loại</th>
                            <th>Số câu</th>
                            <th>Mặc định chung?</th>
                            <th style={{minWidth: '220px'}}>Hành động</th>
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
                                {qSet.is_default_general ? 
                                    (<span style={{color: 'var(--admin-nav-link-active-bg)', fontWeight: 'bold'}}>Có ✓</span>) : 
                                    (qSet.field_type === 'none' ? 
                                        (<button onClick={() => handleSetDefaultGeneral(qSet.id_name)} disabled={actionLoading} className="admin-button admin-button-small admin-button-outline">
                                            Đặt làm mặc định
                                        </button>) 
                                        : 'Không')}
                            </td>
                            <td>
                                <button onClick={() => openEditModal(qSet)} disabled={actionLoading} className="admin-button admin-button-small" style={{marginRight: '8px'}}>
                                    Sửa
                                </button>
                                <button onClick={() => handleDeleteSet(qSet.id_name)} disabled={actionLoading || (qSet.is_default_general && questionSets.filter(qs => qs.is_default_general && qs.field_type === 'none').length <=1) } className="admin-button admin-button-small admin-button-danger">
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
            <div className="admin-modal-overlay" onClick={() => setEditModalIsOpen(false) /* Đóng khi click overlay */}>
                <div className="admin-modal-content" onClick={(e) => e.stopPropagation() /* Ngăn đóng khi click content */}>
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
                        <div className="admin-form-group admin-form-checkbox-group">
                            <input type="checkbox" id="editSetIsDefaultGeneral" checked={editingSet.is_default_general} 
                                   onChange={(e) => setEditingSet({...editingSet, is_default_general: e.target.checked, modalError: ''})} />
                            <label htmlFor="editSetIsDefaultGeneral">Là bộ câu hỏi chung mặc định?</label>
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