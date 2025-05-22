from typing import List, Optional
from .models import Question
from datetime import timezone

# ID của các bộ câu hỏi này sẽ được dùng làm giá trị khởi tạo
# cho document cấu hình mặc định trong MongoDB.
# Chúng không còn trực tiếp quyết định bộ nào được dùng trong quá trình phỏng vấn nữa,
# mà quyết định đó sẽ dựa trên document cấu hình.

# BỘ CÂU HỎI CHUNG MẶC ĐỊNH (để khởi tạo config)
INITIAL_DEFAULT_GENERAL_QSET_ID = "general_soft_skills_v1"
SAMPLE_GENERAL_QUESTIONS: List[Question] = [
    Question(text="Hãy giới thiệu ngắn gọn về bản thân bạn.", order=1),
    Question(text="Điểm mạnh lớn nhất của bạn là gì? Hãy cho ví dụ cụ thể.", order=2),
    Question(text="Bạn có thể mô tả một tình huống khó khăn bạn đã gặp phải và cách bạn giải quyết nó không?", order=3),
    Question(text="Mục tiêu nghề nghiệp của bạn trong 3-5 năm tới là gì?", order=4),
]

# BỘ CÂU HỎI CHO DEVELOPER (để khởi tạo config)
INITIAL_DEFAULT_DEVELOPER_QSET_ID = "developer_technical_v1"
SAMPLE_DEVELOPER_QUESTIONS: List[Question] = [
    Question(text="Bạn muốn ứng tuyển vào vị trí cụ thể nào trong lĩnh vực Developer (ví dụ: Frontend, Backend, Fullstack, Mobile...)?", order=1),
    Question(text="Hãy mô tả một dự án lập trình mà bạn tự hào nhất và vai trò của bạn trong đó.", order=2),
    Question(text="Bạn thường sử dụng ngôn ngữ lập trình và công nghệ nào? Tại sao bạn chọn chúng?", order=3),
    Question(text="Giải thích khái niệm SOLID trong lập trình hướng đối tượng.", order=4),
    Question(text="Khi gặp một bug khó, quy trình debug của bạn như thế nào?", order=5),
]

# BỘ CÂU HỎI CHO DESIGNER (để khởi tạo config)
INITIAL_DEFAULT_DESIGNER_QSET_ID = "designer_creative_v1"
SAMPLE_DESIGNER_QUESTIONS: List[Question] = [
    Question(text="Bạn muốn ứng tuyển vào vị trí cụ thể nào trong lĩnh vực Design (ví dụ: UI/UX, Graphic, Product...)?", order=1),
    Question(text="Hãy mô tả một dự án thiết kế mà bạn tâm đắc nhất. Quy trình thiết kế của bạn là gì?", order=2),
    Question(text="Bạn thường sử dụng công cụ thiết kế nào (ví dụ: Figma, Adobe XD, Sketch)? Điểm mạnh của công cụ bạn chọn là gì?", order=3),
    Question(text="Theo bạn, yếu tố nào là quan trọng nhất để tạo ra một trải nghiệm người dùng tốt?", order=4),
    Question(text="Làm thế nào bạn cập nhật các xu hướng thiết kế mới nhất?", order=5),
]

def get_question_by_order(order: int, question_list: List[Question]) -> Optional[Question]:
    for q in question_list:
        if q.order == order:
            return q
    return None

def get_total_questions(question_list: List[Question]) -> int:
    return len(question_list)