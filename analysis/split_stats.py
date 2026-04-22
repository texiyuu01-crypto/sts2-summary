import json
import os

def split_json(input_file, output_dir):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    os.makedirs(output_dir, exist_ok=True)

    # 1. 概要データだけを抽出
    summary = data.get('summary', {})
    with open(f'{output_dir}/summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"Generated: summary.json")

    # 2. キャラクターごとのカードデータを分割
    cards_data = data.get('cards', {})
    for char_name, cards in cards_data.items():
        filename = f"cards_{char_name.lower()}.json"
        with open(f'{output_dir}/{filename}', 'w', encoding='utf-8') as f:
            json.dump(cards, f, ensure_ascii=False, indent=2)
            print(f"Generated: {filename}")

    # 3. バージョン別統計も分割
    by_version = data.get('by_version', {})
    if by_version:
        version_summary = by_version.get('summary', {})
        with open(f'{output_dir}/by_version_summary.json', 'w', encoding='utf-8') as f:
            json.dump(version_summary, f, ensure_ascii=False, indent=2)
        print(f"Generated: by_version_summary.json")

        version_cards = by_version.get('cards', {})
        for char_name, cards in version_cards.items():
            filename = f"by_version_cards_{char_name.lower()}.json"
            with open(f'{output_dir}/{filename}', 'w', encoding='utf-8') as f:
                json.dump(cards, f, ensure_ascii=False, indent=2)
                print(f"Generated: {filename}")

    # 4. 難易度別統計も分割
    by_ascension = data.get('by_ascension', {})
    if by_ascension:
        asc_summary = by_ascension.get('summary', {})
        with open(f'{output_dir}/by_ascension_summary.json', 'w', encoding='utf-8') as f:
            json.dump(asc_summary, f, ensure_ascii=False, indent=2)
        print(f"Generated: by_ascension_summary.json")

        asc_cards = by_ascension.get('cards', {})
        for char_name, cards in asc_cards.items():
            filename = f"by_ascension_cards_{char_name.lower()}.json"
            with open(f'{output_dir}/{filename}', 'w', encoding='utf-8') as f:
                json.dump(cards, f, ensure_ascii=False, indent=2)
                print(f"Generated: {filename}")

    # 5. バージョン×難易度別統計も分割
    by_va = data.get('by_version_ascension', {})
    if by_va:
        va_summary = by_va.get('summary', {})
        with open(f'{output_dir}/by_version_ascension_summary.json', 'w', encoding='utf-8') as f:
            json.dump(va_summary, f, ensure_ascii=False, indent=2)
        print(f"Generated: by_version_ascension_summary.json")

        va_cards = by_va.get('cards', {})
        for version, char_data in va_cards.items():
            for char_name, cards in char_data.items():
                filename = f"by_version_ascension_cards_{version}_{char_name.lower()}.json"
                with open(f'{output_dir}/{filename}', 'w', encoding='utf-8') as f:
                    json.dump(cards, f, ensure_ascii=False, indent=2)
                    print(f"Generated: {filename}")

    # 6. updated_atも保存
    updated_at = data.get('updated_at', '')
    with open(f'{output_dir}/updated_at.json', 'w', encoding='utf-8') as f:
        json.dump({'updated_at': updated_at}, f, ensure_ascii=False, indent=2)
    print(f"Generated: updated_at.json")

if __name__ == "__main__":
    split_json('src/data/tier_stats.json', 'public/data')
