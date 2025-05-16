from typing import List, Optional
from .models import Question

DEFAULT_QUESTION_SET_ID = "default_soft_skills_v1"

SAMPLE_QUESTIONS: List[Question] = [
    Question(text="Hãy giới thiệu ngắn gọn về bản thân bạn.", order=1),
    Question(text="Điểm mạnh lớn nhất của bạn là gì? Hãy cho ví dụ cụ thể.", order=2),
    Question(text="Bạn có thể mô tả một tình huống khó khăn bạn đã gặp phải và cách bạn giải quyết nó không?", order=3),
    Question(text="Mục tiêu nghề nghiệp của bạn trong 3-5 năm tới là gì?", order=4),
]

def get_question_by_order(order: int) -> Optional[Question]:
    for q in SAMPLE_QUESTIONS:
        if q.order == order:
            return q
    return None

def get_total_questions() -> int:
    return len(SAMPLE_QUESTIONS)