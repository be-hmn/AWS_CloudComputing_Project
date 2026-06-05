from typing import List, Dict, Any
from utils.db import (
    get_request_by_id,
    get_all_mentors,
    get_mentor_active_requests_count,
    get_mentor_confirmed_requests,
)
from utils.auth import is_admin
from utils.response import success_response, error_response
from utils.schedule_helper import has_schedule_conflict_on_date
from utils.bedrock_embed import is_field_match

def handle_get_candidates(event: dict) -> dict:
    """GET /requests/{request_id}/candidates - 멘토 후보 추천 (Bedrock 의미 기반 매칭)"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        if not is_admin(auth_header):
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can access this endpoint')

        path_parameters = event.get('pathParameters') or {}
        request_id = path_parameters.get('request_id', '').strip()

        if not request_id:
            return error_response(400, 'MISSING_REQUEST_ID', 'request_id is required')

        request_item = get_request_by_id(request_id)
        if not request_item:
            return error_response(404, 'REQUEST_NOT_FOUND', 'Request not found')

        interest_field = request_item.get('interest_field', '').strip()
        if not interest_field:
            return error_response(400, 'MISSING_INTEREST_FIELD', 'Request has no interest field')

        preferred_date = request_item.get('preferred_date', '').strip()
        preferred_time = request_item.get('preferred_time', '').strip()
        use_time_filter = bool(preferred_date and preferred_time)

        all_mentors = get_all_mentors()
        candidates  = []

        for mentor in all_mentors:
            mentor_fields = mentor.get('mentor_fields', [])
            if not mentor_fields:
                continue

            # Bedrock 의미 기반 매칭 (동의어·유사어 포함)
            matched, score = is_field_match(interest_field, mentor_fields)
            if not matched:
                continue

            mentor_id = mentor.get('user_id')

            # 희망 시간대 충돌 검사
            if use_time_filter:
                confirmed = get_mentor_confirmed_requests(mentor_id)
                if has_schedule_conflict_on_date(confirmed, preferred_date, preferred_time):
                    continue

            active_count        = get_mentor_active_requests_count(mentor_id)
            has_available_times = bool(mentor.get('available_times', {}))

            candidates.append({
                'mentor_id':            mentor_id,
                'nickname':             mentor.get('nickname', ''),
                'intro':                mentor.get('intro', ''),
                'mentor_fields':        mentor_fields,
                'active_request_count': active_count,
                'available':            has_available_times,
                'match_score':          round(score, 4),
            })

        # 정렬: 1) 유사도 높은 순, 2) 진행 건수 적은 순, 3) available 여부
        candidates.sort(
            key=lambda x: (
                -x['match_score'],
                x['active_request_count'],
                not x['available'],
            )
        )

        response_data = {
            'request_id':      request_id,
            'interest_field':  interest_field,
            'preferred_date':  preferred_date or None,
            'preferred_time':  preferred_time or None,
            'candidate_count': len(candidates),
            'candidates':      candidates,
        }

        return success_response(200, response_data, 'Candidate mentors retrieved successfully')

    except Exception as e:
        print(f"Get candidates error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')