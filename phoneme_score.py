#!/usr/bin/env python3
"""
Phoneme-level pronunciation scorer (mã nguồn mở, miễn phí, offline).

Ý tưởng (evidence-based, không overclaim):
  - Dùng allosaurus (universal phone recognizer) để chuyển audio -> chuỗi âm vị.
  - Chấm âm vị của bác sĩ (user) VÀ âm vị của giọng mẫu Edge-TTS (reference).
  - Căn chỉnh 2 chuỗi (Levenshtein trên âm vị) -> điểm chính xác âm vị
    + danh sách âm bị thay thế / bỏ sót / thêm thừa.
  => So sánh "bạn đọc" với "giọng bản ngữ mẫu mà bạn đang bắt chước".

LƯU Ý TRUNG THỰC: đây là điểm "khoảng cách âm vị so với giọng mẫu TTS",
KHÔNG phải điểm chuẩn vàng của giám khảo người. Nhưng nó đo ĐÚNG cái cần đo
(phát âm), khác hẳn ASR mức từ (chỉ đoán ra từ).

Dùng:  python phoneme_score.py <user_wav> <reference_wav>
In ra JSON: {accuracy, userPhones, refPhones, ops}
"""
import sys, json

def levenshtein_align(a, b):
    """Trả về (distance, ops) — ops là list ('match'|'sub'|'del'|'ins', a_tok, b_tok)."""
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j - 1] + cost, dp[i - 1][j] + 1, dp[i][j - 1] + 1)
    # truy vết
    ops = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + (0 if a[i - 1] == b[j - 1] else 1):
            ops.append(('match' if a[i - 1] == b[j - 1] else 'sub', a[i - 1], b[j - 1]))
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            ops.append(('del', a[i - 1], None))   # bác sĩ đọc thừa âm này (so với mẫu)
            i -= 1
        else:
            ops.append(('ins', None, b[j - 1]))   # bác sĩ thiếu âm này (có trong mẫu)
            j -= 1
    ops.reverse()
    return dp[n][m], ops


def recognize(model, wav_path):
    # allosaurus trả chuỗi âm vị cách nhau bởi dấu cách
    phones = model.recognize(wav_path)
    return [p for p in phones.strip().split() if p]


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "usage: phoneme_score.py <user_wav> <ref_wav>"}))
        return
    user_wav, ref_wav = sys.argv[1], sys.argv[2]
    try:
        from allosaurus.app import read_recognizer
        model = read_recognizer()
    except Exception as e:
        print(json.dumps({"error": f"allosaurus not available: {e}"}))
        return

    def reco(path):
        # Giới hạn kho âm vị tiếng Anh (lang=eng) cho chính xác hơn
        try:
            return [p for p in model.recognize(path, lang_id='eng').strip().split() if p]
        except TypeError:
            return recognize(model, path)

    try:
        user_phones = reco(user_wav)
        ref_phones = reco(ref_wav)
    except Exception as e:
        print(json.dumps({"error": f"recognize failed: {e}"}))
        return

    if not ref_phones:
        print(json.dumps({"error": "reference produced no phones"}))
        return

    dist, ops = levenshtein_align(ref_phones, user_phones)
    matches = sum(1 for o in ops if o[0] == 'match')
    accuracy = round(100 * matches / max(1, len(ref_phones)))

    # Tóm tắt âm sai để phản hồi cơ học
    missing = [o[2] if o[2] else o[1] for o in ops if o[0] == 'ins']  # âm có trong mẫu, bác sĩ thiếu
    substituted = [(o[1], o[2]) for o in ops if o[0] == 'sub']        # mẫu -> bác sĩ

    print(json.dumps({
        "accuracy": accuracy,
        "userPhones": user_phones,
        "refPhones": ref_phones,
        "missing": missing,
        "substituted": substituted,
        "matches": matches,
        "refLen": len(ref_phones),
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
