from utils.db import get_all_records
from utils.auth import get_role_from_token
from utils.response import success_response, error_response

def handle_get_all_records(event: dict) -> dict:
    """GET /records - 전체 상담 기록 조회 (운영자 전용)"""
    try:
        auth_header = event.get('headers', {}).get('Authorization', '')
        role = get_role_from_token(auth_header)

        if role != 'admin':
            return error_response(403, 'FORBIDDEN', 'Only ADMIN can access all records')

        records = get_all_records()

        response_data = {
            'count': len(records),
            'records': [
                {
                    'request_id': item.get('request_id'),
                    'mentee_user_id': item.get('mentee_user_id'),
                    'mentor_user_id': item.get('mentor_user_id'),
                    'status': item.get('status'),
                    'record': item.get('record'),
                    'updated_at': item.get('updated_at'),
                }
                for item in records
            ],
        }

        return success_response(200, response_data, 'All records retrieved successfully')

    except Exception as e:
        print(f"Get all records error: {str(e)}")
        return error_response(500, 'INTERNAL_ERROR', 'Internal server error')
