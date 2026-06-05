import boto3
import os
from datetime import datetime
from typing import Dict, Any, Optional, List

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ['USERS_TABLE_NAME'])
requests_table = dynamodb.Table(os.environ['REQUESTS_TABLE_NAME'])

def get_mentor(mentor_id: str) -> Optional[Dict[str, Any]]:
    """멘토 정보 조회"""
    try:
        response = users_table.get_item(Key={'user_id': mentor_id})
        user = response.get('Item')

        if not user:
            return None

        # role이 mentor인지 확인
        if user.get('role') != 'mentor':
            return None

        return user
    except Exception as e:
        print(f"Error getting mentor: {str(e)}")
        raise

def update_mentor_info(mentor_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """멘토 기본 정보 수정 (intro) - 허용된 필드만 업데이트"""
    ALLOWED_FIELDS = {'intro'}
    try:
        now = int(datetime.utcnow().timestamp())
        # 허용된 필드만 필터링
        safe_updates = {k: v for k, v in updates.items() if k in ALLOWED_FIELDS}
        safe_updates['updated_at'] = now

        set_clauses = [f'#f_{key} = :v_{key}' for key in safe_updates]
        expression_attribute_names = {f'#f_{key}': key for key in safe_updates}
        expression_attribute_values = {f':v_{key}': val for key, val in safe_updates.items()}

        response = users_table.update_item(
            Key={'user_id': mentor_id},
            UpdateExpression='SET ' + ', '.join(set_clauses),
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error updating mentor info: {str(e)}")
        raise

def update_mentor_fields(mentor_id: str, mentor_fields: list) -> Dict[str, Any]:
    """멘토 전공 분야 수정"""
    try:
        response = users_table.update_item(
            Key={'user_id': mentor_id},
            UpdateExpression='SET mentor_fields = :fields, updated_at = :now',
            ExpressionAttributeValues={
                ':fields': mentor_fields,
                ':now': int(datetime.utcnow().timestamp())
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error updating mentor fields: {str(e)}")
        raise

def update_available_times(mentor_id: str, available_times: dict) -> Dict[str, Any]:
    """멘토 상담 가능 시간 수정"""
    try:
        response = users_table.update_item(
            Key={'user_id': mentor_id},
            UpdateExpression='SET available_times = :times, updated_at = :now',
            ExpressionAttributeValues={
                ':times': available_times,
                ':now': int(datetime.utcnow().timestamp())
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error updating available times: {str(e)}")
        raise

def update_mentor_active(mentor_id: str, active: bool) -> Dict[str, Any]:
    """멘토 활성화 상태 변경"""
    try:
        response = users_table.update_item(
            Key={'user_id': mentor_id},
            UpdateExpression='SET mentor_active = :active, updated_at = :now',
            ExpressionAttributeValues={
                ':active': active,
                ':now': int(datetime.utcnow().timestamp())
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error updating mentor active: {str(e)}")
        raise

def add_field_verification(mentor_id: str, field: str, file_key: str) -> Dict[str, Any]:
    """
    증빙 요청 추가.
    field_verifications 리스트에 pending 항목 append.
    이미 같은 field의 pending/approved가 있으면 덮어쓰지 않고 새로 추가.
    """
    try:
        now = int(datetime.utcnow().timestamp())
        verification_item = {
            'field': field,
            'status': 'pending',
            'file_key': file_key,
            'submitted_at': now,
        }
        response = users_table.update_item(
            Key={'user_id': mentor_id},
            UpdateExpression=(
                'SET field_verifications = list_append('
                '  if_not_exists(field_verifications, :empty), :new_item'
                '), updated_at = :now'
            ),
            ExpressionAttributeValues={
                ':new_item': [verification_item],
                ':empty':    [],
                ':now':      now,
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error adding field verification: {str(e)}")
        raise


def approve_field_verification(mentor_id: str, field: str) -> Dict[str, Any]:
    """
    증빙 승인:
    - field_verifications 에서 해당 field의 가장 최신 pending 항목을 approved로 변경
    - verified_fields 에 field 추가 (중복 방지)
    """
    try:
        now = int(datetime.utcnow().timestamp())
        mentor = get_mentor(mentor_id)
        verifications = mentor.get('field_verifications', [])

        # 최신 pending 항목 인덱스 찾기 (역순)
        idx = None
        for i in reversed(range(len(verifications))):
            if verifications[i].get('field') == field and verifications[i].get('status') == 'pending':
                idx = i
                break

        if idx is None:
            raise ValueError(f"No pending verification found for field: {field}")

        # 해당 인덱스의 status/reviewed_at 업데이트
        verified_fields = list(set(mentor.get('verified_fields', []) + [field]))

        response = users_table.update_item(
            Key={'user_id': mentor_id},
            UpdateExpression=(
                f'SET field_verifications[{idx}].#st = :approved, '
                f'field_verifications[{idx}].reviewed_at = :now, '
                f'verified_fields = :vf, '
                f'updated_at = :now'
            ),
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={
                ':approved': 'approved',
                ':now':      now,
                ':vf':       verified_fields,
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error approving field verification: {str(e)}")
        raise


def reject_field_verification(mentor_id: str, field: str, reject_reason: str) -> Dict[str, Any]:
    """
    증빙 거절:
    - field_verifications 에서 해당 field의 가장 최신 pending 항목을 rejected로 변경
    """
    try:
        now = int(datetime.utcnow().timestamp())
        mentor = get_mentor(mentor_id)
        verifications = mentor.get('field_verifications', [])

        idx = None
        for i in reversed(range(len(verifications))):
            if verifications[i].get('field') == field and verifications[i].get('status') == 'pending':
                idx = i
                break

        if idx is None:
            raise ValueError(f"No pending verification found for field: {field}")

        response = users_table.update_item(
            Key={'user_id': mentor_id},
            UpdateExpression=(
                f'SET field_verifications[{idx}].#st = :rejected, '
                f'field_verifications[{idx}].reviewed_at = :now, '
                f'field_verifications[{idx}].reject_reason = :reason, '
                f'updated_at = :now'
            ),
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={
                ':rejected': 'rejected',
                ':now':      now,
                ':reason':   reject_reason,
            },
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    except Exception as e:
        print(f"Error rejecting field verification: {str(e)}")
        raise


def get_all_pending_verifications() -> list:
    """
    pending 상태 증빙이 있는 멘토 목록 반환 (운영자용).
    role-index GSI로 mentor 전체 스캔 후 필터링.
    """
    try:
        response = users_table.query(
            IndexName='role-index',
            KeyConditionExpression='#role = :role',
            ExpressionAttributeNames={'#role': 'role'},
            ExpressionAttributeValues={':role': 'mentor'}
        )
        mentors = response.get('Items', [])
        while 'LastEvaluatedKey' in response:
            response = users_table.query(
                IndexName='role-index',
                KeyConditionExpression='#role = :role',
                ExpressionAttributeNames={'#role': 'role'},
                ExpressionAttributeValues={':role': 'mentor'},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            mentors.extend(response.get('Items', []))

        result = []
        for m in mentors:
            pending = [
                v for v in m.get('field_verifications', [])
                if v.get('status') == 'pending'
            ]
            if pending:
                result.append({
                    'mentor_id': m['user_id'],
                    'nickname':  m.get('nickname', ''),
                    'pending_verifications': pending,
                })
        return result
    except Exception as e:
        print(f"Error getting pending verifications: {str(e)}")
        raise

def get_mentor_assigned_requests(mentor_id: str) -> List[Dict[str, Any]]:
    """멘토에게 배정된 요청 목록 조회 (ASSIGNED, CONFIRMED, COMPLETED 포함)"""
    try:
        response = requests_table.query(
            IndexName='mentor-index',
            KeyConditionExpression='mentor_user_id = :mentor_id',
            ExpressionAttributeValues={':mentor_id': mentor_id}
        )
        items = response.get('Items', [])

        while 'LastEvaluatedKey' in response:
            response = requests_table.query(
                IndexName='mentor-index',
                KeyConditionExpression='mentor_user_id = :mentor_id',
                ExpressionAttributeValues={':mentor_id': mentor_id},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        # ASSIGNED, CONFIRMED, COMPLETED 상태만 반환 (반려·취소 제외)
        return [
            item for item in items
            if item.get('status') in ['ASSIGNED', 'CONFIRMED', 'COMPLETED']
        ]
    except Exception as e:
        print(f"Error getting mentor assigned requests: {str(e)}")
        raise
