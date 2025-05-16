import React, { useState, useEffect } from 'react';
import adminApi from '../../services/adminApi';

function QuestionSetsPage() {
  const [questionSets, setQuestionSets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [newSetIdName, setNewSetIdName] = useState('');
  const [newSetName, setNewSetName] = useState('');
  const [newSetQuestionsJson, setNewSetQuestionsJson] = useState(
    '[\n  {\n    "text": "Câu hỏi mẫu 1?",\n    "order": 1\n  },\n  {\n    "text": "Câu hỏi mẫu 2?",\n    "order": 2\n  }\n]'
  );

  const fetchQuestionSets = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Sử dụng adminApi và chỉ cần đường dẫn tương đối
      const response = await adminApi.get('/question-sets'); 
      setQuestionSets(response.data);
    } catch (err) {
      let errMsg = 'Không thể tải danh sách bộ câu hỏi. ';
      if (axios.isAxiosError(err) && err.response) { // Giữ lại axios.isAxiosError để kiểm tra lỗi từ axios
         errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
      } else {
         errMsg += err.message;
      }
      setError(errMsg);
      console.error("Error fetching question sets:", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQuestionSets();
  }, []);

  const handleAddSet = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const questionsArray = JSON.parse(newSetQuestionsJson);
      const payload = {
        id_name: newSetIdName || undefined,
        name: newSetName,
        questions: questionsArray
      };
      // Sử dụng adminApi và chỉ cần đường dẫn tương đối
      await adminApi.post('/question-sets', payload); 
      setNewSetIdName('');
      setNewSetName('');
      setNewSetQuestionsJson(
        '[\n  {\n    "text": "Câu hỏi mẫu 1?",\n    "order": 1\n  },\n  {\n    "text": "Câu hỏi mẫu 2?",\n    "order": 2\n  }\n]'
      );
      fetchQuestionSets();
    } catch (err) {
      let errMsg = 'Lỗi khi thêm bộ câu hỏi. ';
      // Giữ lại axios.isAxiosError để kiểm tra lỗi từ axios
      if (axios.isAxiosError(err) && err.response) { 
         errMsg += err.response.data?.detail || JSON.stringify(err.response.data) || err.message;
      } else if (err instanceof SyntaxError) {
         errMsg += 'Lỗi cú pháp JSON trong dữ liệu câu hỏi.';
      } else {
         errMsg += err.message;
      }
      setError(errMsg);
      console.error("Error adding question set:", err);
    }
    setIsLoading(false);
  };

  // Thêm import axios ở đây chỉ để dùng cho axios.isAxiosError
  // Nếu không muốn, bạn có thể kiểm tra lỗi theo cách khác (ví dụ: err.response)
  const axios = adminApi.defaults.adapter; // Lấy lại axios gốc nếu cần cho isAxiosError
                                          // Hoặc đơn giản là import axios from 'axios' ở đầu file
                                          // và chỉ dùng adminApi cho request.

  return (
    <div>
      <h1>Quản lý Bộ Câu Hỏi</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>Thêm Bộ Câu Hỏi Mới</h2>
      <form onSubmit={handleAddSet} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px' }}>
        <div>
          <label htmlFor="idName">ID định danh (tùy chọn, nếu bỏ trống sẽ tự sinh): </label>
          <input
            type="text"
            id="idName"
            value={newSetIdName}
            onChange={(e) => setNewSetIdName(e.target.value)}
          />
        </div>
        <div style={{ marginTop: '10px' }}>
          <label htmlFor="name">Tên bộ câu hỏi: </label>
          <input
            type="text"
            id="name"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: '10px' }}>
          <label htmlFor="questionsJson">Các câu hỏi (JSON format): </label>
          <textarea
            id="questionsJson"
            value={newSetQuestionsJson}
            onChange={(e) => setNewSetQuestionsJson(e.target.value)}
            rows={10}
            style={{ width: '100%', fontFamily: 'monospace' }}
            required
          />
          <small>{'Ví dụ: [{"text": "Câu hỏi 1?", "order": 1}, {"text": "Câu hỏi 2?", "order": 2}]'}</small>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          style={{ marginTop: '10px' }}
        >
          {isLoading ? 'Đang thêm...' : 'Thêm mới'}
        </button>
      </form>

      <h2>Danh sách Bộ Câu Hỏi</h2>
      {isLoading && <p>Đang tải...</p>}
      {!isLoading && questionSets.length === 0 && <p>Chưa có bộ câu hỏi nào.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {questionSets.map(qSet => (
          <li key={qSet.id_name} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}>
            <strong>ID:</strong> {qSet.id_name} <br />
            <strong>Tên:</strong> {qSet.name} <br />
            <strong>Số câu hỏi:</strong> {qSet.questions.length} <br />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default QuestionSetsPage;