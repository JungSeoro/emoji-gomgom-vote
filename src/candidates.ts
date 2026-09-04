import frame11 from '../asset/optimized/frame-11.webp'
import frame12 from '../asset/optimized/frame-12.webp'
import frame21 from '../asset/optimized/frame-21.webp'
import frame24 from '../asset/optimized/frame-24.webp'
import frame413 from '../asset/optimized/frame-413.webp'
import frame414 from '../asset/optimized/frame-414.webp'
import frame415 from '../asset/optimized/frame-415.webp'
import frame416 from '../asset/optimized/frame-416.webp'
import frame417 from '../asset/optimized/frame-417.webp'
import frame418 from '../asset/optimized/frame-418.webp'
import frame419 from '../asset/optimized/frame-419.webp'
import frame420 from '../asset/optimized/frame-420.webp'
import frame421 from '../asset/optimized/frame-421.webp'
import frame422 from '../asset/optimized/frame-422.webp'
import frame423 from '../asset/optimized/frame-423.webp'
import frame424 from '../asset/optimized/frame-424.webp'
import frame425 from '../asset/optimized/frame-425.webp'
import frame426 from '../asset/optimized/frame-426.webp'
import frame427 from '../asset/optimized/frame-427.webp'
import frame428 from '../asset/optimized/frame-428.webp'
import frame429 from '../asset/optimized/frame-429.webp'
import frame430 from '../asset/optimized/frame-430.webp'
import frame431 from '../asset/optimized/frame-431.webp'
import frame432 from '../asset/optimized/frame-432.webp'
import frame433 from '../asset/optimized/frame-433.webp'
import frame434 from '../asset/optimized/frame-434.webp'
import frame436 from '../asset/optimized/frame-436.webp'
import frame437 from '../asset/optimized/frame-437.webp'
import frame438 from '../asset/optimized/frame-438.webp'
import chatgpt3 from '../asset/optimized/chatgpt-3.webp'
import chatgpt9 from '../asset/optimized/chatgpt-9.webp'
import chatgpt11 from '../asset/optimized/chatgpt-11.webp'
import chatgpt13 from '../asset/optimized/chatgpt-13.webp'
import chatgpt14 from '../asset/optimized/chatgpt-14.webp'
import image153 from '../asset/optimized/image-153.webp'
import image154 from '../asset/optimized/image-154.webp'

export type Candidate = {
  id: string
  code: string
  name: string
  description: string
  image: string
  setId: string | null
}

export type CandidateGroup = {
  id: string
  title: string
  isSet: boolean
  candidates: Candidate[]
}

export const pollConfig = {
  id: 'd844f5be-88d4-4a98-95d4-cb6e569f68bf',
  minSelections: 20,
  maxSelections: 20,
  feedbackMaxLength: 500,
}

export const getSelectionCountError = (selectionCount: number) => {
  const { minSelections, maxSelections } = pollConfig

  if (selectionCount >= minSelections && selectionCount <= maxSelections) return null

  if (minSelections === maxSelections) {
    const difference = minSelections - selectionCount

    if (difference > 0) {
      return `이모티콘을 정확히 ${minSelections}개 선택해 주세요. ${difference}개 더 골라야 해요.`
    }

    return `이모티콘을 정확히 ${minSelections}개 선택해 주세요. ${Math.abs(difference)}개를 빼 주세요.`
  }

  if (selectionCount < minSelections) {
    return `이모티콘을 최소 ${minSelections}개 선택해 주세요.`
  }

  return `이모티콘은 최대 ${maxSelections}개까지 선택할 수 있어요.`
}

export const candidateGroups: CandidateGroup[] = [
  {
    id: 'question-reactions',
    title: '어리둥절 리액션 세트',
    isSet: true,
    candidates: [
      {
        id: 'efcb379e-3e8e-58d1-954e-3d5901357079',
        code: '01',
        name: '제가요...?',
        description: '눈을 반짝이며 자신을 가리키는 곰곰',
        image: frame432,
        setId: 'question-reactions',
      },
      {
        id: '5112ad83-739e-510e-82a6-e5895e3150fe',
        code: '02',
        name: '...?',
        description: '어리둥절한 표정으로 되묻는 곰곰',
        image: frame433,
        setId: 'question-reactions',
      },
      {
        id: '93c30762-575e-5a86-b192-169f4aebeba1',
        code: '03',
        name: '뭐?',
        description: '깜짝 놀라며 되묻는 곰곰',
        image: frame434,
        setId: 'question-reactions',
      },
    ],
  },
  {
    id: 'nervous',
    title: '긴장 폭포',
    isSet: false,
    candidates: [
      {
        id: 'f0c5a958-70fc-51ed-92c7-c748ae7df08f',
        code: '04',
        name: '긴장 폭포',
        description: '머리 위로 식은땀이 쏟아지는 곰곰',
        image: frame431,
        setId: null,
      },
    ],
  },
  {
    id: 'thinking',
    title: '고민 중 리액션 세트',
    isSet: true,
    candidates: [
      {
        id: '7189a3f4-6400-5e3a-a421-0dd96d027695',
        code: '05',
        name: '난가?',
        description: '턱을 괴고 자신인지 고민하는 곰곰',
        image: frame429,
        setId: 'thinking',
      },
      {
        id: 'ae8d39a0-3988-5846-a149-130e8c29d333',
        code: '06',
        name: '흠...',
        description: '턱을 괴고 곰곰이 생각하는 곰곰',
        image: frame430,
        setId: 'thinking',
      },
    ],
  },
  {
    id: 'beard',
    title: '수염 난 곰곰',
    isSet: false,
    candidates: [
      {
        id: '4c9231c5-629e-5ad7-9a24-0549a373d657',
        code: '07',
        name: '수염 난 곰곰',
        description: '안경 아래에 수염이 난 익살스러운 곰곰',
        image: frame428,
        setId: null,
      },
    ],
  },
  {
    id: 'dimension',
    title: '차원이 다른 3D',
    isSet: false,
    candidates: [
      {
        id: 'a744220d-acd1-5fe0-a8ec-446a58442d1e',
        code: '08',
        name: '차원이 달라',
        description: '입체 모습으로 변신한 3D 곰곰',
        image: frame427,
        setId: null,
      },
    ],
  },
  {
    id: 'work-go',
    title: '뭐든 고? 세트',
    isSet: true,
    candidates: [
      {
        id: '119b2b8e-e841-50b1-89f2-b7da09965de7',
        code: '09',
        name: '회식 고?',
        description: '맥주잔 두 개를 들고 회식을 외치는 곰곰',
        image: frame424,
        setId: 'work-go',
      },
      {
        id: '00bacb0b-0f26-51ba-899d-b87a17c766e6',
        code: '10',
        name: '야근 고?',
        description: '보고서 두 장을 들고 야근을 외치는 곰곰',
        image: frame425,
        setId: 'work-go',
      },
      {
        id: '849b0080-dcbd-54f4-a924-f6309c666b99',
        code: '11',
        name: '알파 고?',
        description: '번개를 두르고 힘차게 양팔을 드는 곰곰',
        image: frame426,
        setId: 'work-go',
      },
    ],
  },
  {
    id: 'mx-cheer',
    title: 'MX 야호!',
    isSet: false,
    candidates: [
      {
        id: '21dd0289-5bc0-5080-b497-9e05a2f501e8',
        code: '12',
        name: 'MX☆ 야호~',
        description: '작은 인형을 들고 신나게 환호하는 곰곰',
        image: frame413,
        setId: null,
      },
    ],
  },
  {
    id: 'good',
    title: '굿!',
    isSet: false,
    candidates: [
      {
        id: 'a73d71b4-aaf2-5e8f-90ed-5d9861330088',
        code: '13',
        name: '굿~!',
        description: '엄지손가락을 크게 내미는 곰곰',
        image: frame423,
        setId: null,
      },
    ],
  },
  {
    id: 'tea-a',
    title: '한잔해',
    isSet: false,
    candidates: [
      {
        id: 'c70a766c-fd89-484d-8615-f3300a870411',
        code: '14',
        name: '한잔 해~',
        description: '정장을 입고 찻잔을 건네는 곰곰',
        image: frame12,
        setId: null,
      },
    ],
  },
  {
    id: 'hero',
    title: '안녕히 계세요 여러분',
    isSet: false,
    candidates: [
      {
        id: '5e70d59a-86be-475d-8222-b05a811d87ca',
        code: '15',
        name: '안녕히 계세요 여러분~',
        description: '왕관과 빨간 망토를 입고 힘차게 날아가는 곰곰',
        image: frame414,
        setId: null,
      },
    ],
  },
  {
    id: 'approval',
    title: '결재 도장 세트',
    isSet: true,
    candidates: [
      {
        id: 'c67487de-2c8d-5adb-975f-adf4fb9d5c6a',
        code: '16',
        name: '결재 부탁합니다',
        description: '결재를 부탁하는 보라색 곰곰 도장',
        image: frame420,
        setId: 'approval',
      },
      {
        id: '0be68ec9-8a21-5808-a2bb-ab826ccfe8a2',
        code: '17',
        name: '결재 반려',
        description: '엄지를 내리며 결재를 반려하는 곰곰 도장',
        image: frame421,
        setId: 'approval',
      },
      {
        id: 'e2c55c72-5642-584c-aa72-c20bd1c37364',
        code: '18',
        name: '결재 진행시켜',
        description: '엄지를 들며 결재를 승인하는 곰곰 도장',
        image: frame422,
        setId: 'approval',
      },
    ],
  },
  {
    id: 'issue',
    title: '이슈 있슈?',
    isSet: false,
    candidates: [
      {
        id: '75e6f2eb-863b-5587-a243-d46d275e0762',
        code: '19',
        name: '이슈 있슈?',
        description: '노트북 앞에서 이슈를 발견하고 놀란 곰곰',
        image: frame417,
        setId: null,
      },
    ],
  },
  {
    id: 'called',
    title: '부르셨나요?',
    isSet: false,
    candidates: [
      {
        id: 'fcfd095e-1dfe-5e5c-9b02-e28ec39eee85',
        code: '20',
        name: '부르셨나요?',
        description: '문 뒤에서 고개를 빼꼼 내미는 곰곰',
        image: frame419,
        setId: null,
      },
    ],
  },
  {
    id: 'coffee',
    title: '커피 고?',
    isSet: false,
    candidates: [
      {
        id: 'e51f4102-27c0-58c6-85a5-8498fd249ba8',
        code: '21',
        name: '커피 고?',
        description: '커피잔을 들고 함께 마시자고 제안하는 곰곰',
        image: frame415,
        setId: null,
      },
    ],
  },
  {
    id: 'bow',
    title: '인사와 사과 세트',
    isSet: true,
    candidates: [
      {
        id: 'e6331ca5-b411-5f99-a932-8cdd8e2749f2',
        code: '22',
        name: '죄송합니다',
        description: '눈물을 흘리며 깊이 사과하는 곰곰',
        image: frame21,
        setId: 'bow',
      },
      {
        id: '962090c8-3ee3-58e2-842e-dae1e9a36f70',
        code: '23',
        name: '공손한 인사',
        description: '두 손을 모으고 공손하게 허리 숙인 곰곰',
        image: frame24,
        setId: 'bow',
      },
      {
        id: 'b1758c68-81e3-54e3-b182-9e6219883737',
        code: '24',
        name: '감사합니다',
        description: '감사의 마음을 담아 허리 숙인 곰곰',
        image: frame416,
        setId: 'bow',
      },
    ],
  },
  {
    id: 'hello',
    title: '안녕하세요',
    isSet: false,
    candidates: [
      {
        id: '8fac4fc9-f80b-5428-bf48-57513f2b9add',
        code: '25',
        name: '안녕하세요',
        description: '밝게 웃으며 손을 흔드는 곰곰',
        image: frame418,
        setId: null,
      },
    ],
  },
  {
    id: 'shock',
    title: '분노 폭발',
    isSet: false,
    candidates: [
      {
        id: 'd1f1c353-3881-5dfd-b139-be08aa713f04',
        code: '26',
        name: '분노 폭발',
        description: '초록 연기 속에서 화가 폭발한 곰곰',
        image: frame436,
        setId: null,
      },
    ],
  },
  {
    id: 'chest',
    title: '심장이 찌릿 세트',
    isSet: true,
    candidates: [
      {
        id: '0b1138ee-3494-5b92-acbd-332b3456eb1b',
        code: '27',
        name: '가슴이 차가워',
        description: '가슴의 푸른빛을 붙잡고 힘들어하는 곰곰',
        image: frame11,
        setId: 'chest',
      },
      {
        id: '9ce58f8d-b36b-58a6-aac1-f7fc6eb10c90',
        code: '28',
        name: '가슴이 뜨거워',
        description: '가슴의 붉은빛을 붙잡고 힘들어하는 곰곰',
        image: frame437,
        setId: 'chest',
      },
    ],
  },
  {
    id: 'look-around',
    title: '살펴보는 중',
    isSet: false,
    candidates: [
      {
        id: '92576c1a-8088-46df-a89a-c0f1c9effe09',
        code: '29',
        name: '살펴보는 중',
        description: '쌍안경을 들고 꼼꼼히 살펴보는 곰곰',
        image: frame438,
        setId: null,
      },
    ],
  },
  {
    id: 'late-work',
    title: '야근...',
    isSet: false,
    candidates: [
      {
        id: 'c7e4fe93-e907-4894-afff-9b3a1a8edc3a',
        code: '30',
        name: '야근...',
        description: '커피와 당근을 들고 야근을 버티는 곰곰',
        image: chatgpt3,
        setId: null,
      },
    ],
  },
  {
    id: 'is-this-life',
    title: '이게 사는 건가?',
    isSet: false,
    candidates: [
      {
        id: '77bbe9fd-62b7-4c87-a051-ddf065a179dd',
        code: '31',
        name: '이게 사는 건가?',
        description: '바닥에 누워 삶을 되돌아보는 곰곰',
        image: chatgpt9,
        setId: null,
      },
    ],
  },
  {
    id: 'hospital',
    title: '병원 다녀오겠습니다',
    isSet: false,
    candidates: [
      {
        id: 'e4f08866-3b6f-422f-acc8-f087fc9434da',
        code: '32',
        name: '병원 다녀오겠습니다',
        description: '붕대를 감고 체온계를 문 채 병원에 가는 곰곰',
        image: chatgpt11,
        setId: null,
      },
    ],
  },
  {
    id: 'go-to-work',
    title: '출근...',
    isSet: false,
    candidates: [
      {
        id: 'd7c898e2-e2c3-4a7c-9cad-04a4c5b02173',
        code: '33',
        name: '출근...',
        description: '지친 몸을 이끌고 출근하는 곰곰',
        image: chatgpt13,
        setId: null,
      },
    ],
  },
  {
    id: 'review-request',
    title: '리뷰 부탁드립니다',
    isSet: false,
    candidates: [
      {
        id: '1e955ae0-70fa-41d3-b578-71cba2fa881c',
        code: '34',
        name: '리뷰 부탁드립니다',
        description: '돋보기로 문서를 꼼꼼히 검토하는 곰곰',
        image: chatgpt14,
        setId: null,
      },
    ],
  },
  {
    id: 'another-team-dinner',
    title: '또 회식?',
    isSet: false,
    candidates: [
      {
        id: '1d34a28c-92f1-44bf-a82e-4e1b3e99512c',
        code: '35',
        name: '또 회식?',
        description: '갑작스러운 회식 소식에 당황한 곰곰',
        image: image153,
        setId: null,
      },
    ],
  },
  {
    id: 'want-to-go-home',
    title: '집 가고 싶다',
    isSet: false,
    candidates: [
      {
        id: '57bdf22f-e9fa-4477-88cb-3422288460c0',
        code: '36',
        name: '집 가고 싶다',
        description: '책상에 엎드려 퇴근만 기다리는 곰곰',
        image: image154,
        setId: null,
      },
    ],
  },
]

export const candidates = candidateGroups.flatMap((group) => group.candidates)
