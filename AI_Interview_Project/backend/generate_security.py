import random
import string

def tao_ma_bao_mat(do_dai=12):
    ky_tu = string.ascii_letters + string.digits + string.punctuation
    ma = ''.join(random.choice(ky_tu) for _ in range(do_dai))
    return ma

print("Mã bảo mật:", tao_ma_bao_mat())
