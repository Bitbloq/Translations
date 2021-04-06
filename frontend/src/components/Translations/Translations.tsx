import React, { useState, Dispatch, SetStateAction } from 'react';
import './Translations.css';
import TranslationRow from './TranslationRow/TranslationRow';
import Loading from '../Loading/Loading';
import Modal from '../../components/Modal/Modal';
import Pagination from '../../components/Pagination/Pagination';
import {
  Filter,
  Literal,
  LiteralTranslation,
  Translation,
  User,
} from '../../types';
import {
  LiteralResponse,
  PagesResponse,
  TranslationResponse,
} from '../../types-res';
import { useMutation, useQuery } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';

interface TranslationsProps {
  projectName: string;
  languageId: string;
  page: number;
  filter: Filter;
  searchValue: string;
  newLiteral: boolean;
  literalAdded(): void;
  selectLiterals(event: any): void;
  selectPage(page: number): void;
  selectSearch(text: string): void;
  user: User;
}

const Translations: React.FC<TranslationsProps> = (
  props: TranslationsProps,
) => {
  const [translationsState, setTranslationsState]: [
    // The most current values
    LiteralTranslation[],
    Dispatch<SetStateAction<LiteralTranslation[]>>,
  ] = useState([]);

  const [searchInputState, setSearchInputState]: [
    // The text to search
    string,
    Dispatch<SetStateAction<string>>,
  ] = useState(props.searchValue);

  const [removeLiteralModal, setRemoveLiteralModal]: [
    // If the remove modal is open
    boolean,
    Dispatch<SetStateAction<boolean>>,
  ] = useState(false);

  const [literalToRemoveStatus, setLiteralToRemoveStatus]: [
    string,
    Dispatch<SetStateAction<string>>,
  ] = useState('');

  const [literalIdToRemoveStatus, setLiteralIdToRemoveStatus]: [
    string,
    Dispatch<SetStateAction<string>>,
  ] = useState('');

  const REMOVE_LITERAL = gql`
    mutation RemoveLiteral($where: LiteralWhereUniqueInput!) {
      removeLiteral(where: $where) {
        id
      }
    }
  `;

  const UPSERT_TRANSLATIONS = gql`
    mutation UpsertTranslation(
      $where: TranslationWhereUniqueInput!
      $create: TranslationCreateInput!
      $update: TranslationUpdateInput!
    ) {
      upsertTranslation(where: $where, create: $create, update: $update) {
        id
      }
    }
  `;

  const UPDATE_lITERAL = gql`
    mutation UpdateLiteral(
      $where: LiteralWhereUniqueInput!
      $data: LiteralUpdateInput!
    ) {
      updateLiteral(where: $where, data: $data) {
        id
      }
    }
  `;

  const [removeLiteralMutation] = useMutation(REMOVE_LITERAL);
  const [upsert] = useMutation(UPSERT_TRANSLATIONS);
  const [updateLiteralMutation] = useMutation(UPDATE_lITERAL);

  const GET_DATA = gql`
    query GetData($page: Int, $filter: Int, $search: String) {
      literals(
        where: {
          project: { name: "${props.projectName}" },
          language: { id: "${props.languageId}" }
        },
        page: $page,
        filter: $filter
        search: $search
      ) ${LiteralResponse}
      translations(
        where: {
          project: { name: "${props.projectName}" },
          language: { id: "${props.languageId}" }
        }
      ) ${TranslationResponse}
      getLiteralsPages(
        where: {
          project: { name: "${props.projectName}" },
          language: { id: "${props.languageId}" }
        },
        filter: $filter
        search: $search
      ) ${PagesResponse}
    }
  `;

  const { loading, error, data, refetch } = useQuery(GET_DATA, {
    variables: {
      page: props.page,
      filter: props.filter,
      search: props.searchValue,
    },
    fetchPolicy: 'network-only',
  });

  if (loading || error) {
    return <Loading errorMessage={error && error.message} errorCode={500} />;
  }

  const pages = data.getLiteralsPages.pages;
  const literals: Literal[] = data.literals;
  const translations: Translation[] = data.translations;

  const equalTranslations = (
    lt1: LiteralTranslation[],
    lt2: LiteralTranslation[],
  ): boolean => {
    let equals: boolean = true;
    if (lt1.length !== lt2.length) {
      equals = false;
    }
    lt1.forEach((value: LiteralTranslation, index: number) => {
      if (!lt2[index] || value.literalId !== lt2[index].literalId) {
        equals = false;
      }
    });
    return equals;
  };

  const createLiteralTranslations = (
    literals: Literal[],
    translations: Translation[],
  ): LiteralTranslation[] => {
    return literals.map((literal: Literal) => {
      const translation: Translation = translations.find(
        (translation: Translation) =>
          translation.literal.id === literal.id &&
          translation.language.id === props.languageId,
      );
      const translationText = translation ? translation.translation : '';
      const translationId = translation ? translation.id : '0';
      return {
        translationId,
        literalId: literal.id,
        translation: translationText,
        as_in: literal.as_in,
        literal: literal.literal,
        state: translationText ? Filter.TRANSLATED : Filter.NO_TRANSLATED,
      };
    });
  };

  const lt: LiteralTranslation[] = createLiteralTranslations(
    literals,
    translations,
  );

  if (!equalTranslations(lt, translationsState)) {
    setTranslationsState(lt);
  }

  // Change the current value of a translation when onChange
  const changeTranslationValue = (event: any, literalId: string): void => {
    const translations: LiteralTranslation[] = translationsState.map(
      (translation: LiteralTranslation) => {
        if (translation.literalId === literalId)
          translation.translation = event.target.value;
        return translation;
      },
    );
    setTranslationsState(translations);
  };

  // Change the current value of a literal when onChange
  const changeAsInValue = (event: any, literalId: string): void => {
    const translations: LiteralTranslation[] = translationsState.map(
      (translation: LiteralTranslation) => {
        if (translation.literalId === literalId)
          translation.as_in = event.target.value;
        return translation;
      },
    );
    setTranslationsState(translations);
  };

  // Save literal data when onBlur
  const updateLiteral = (literalId: string, as_in: string): void => {
    const originalLiteral: Literal = literals.find(
      (literal: Literal) => literal.id === literalId,
    ) as Literal;

    if (as_in && as_in !== originalLiteral.as_in) {
      updateLiteralMutation({
        variables: {
          where: {
            id: literalId,
          },
          data: {
            as_in,
          },
        },
      }).then(() => {
        refetch().then(result => {
          const { literals, translations } = result.data;
          const lt: LiteralTranslation[] = createLiteralTranslations(
            literals,
            translations,
          );
          setTranslationsState(lt);
        });
      });
    }
  };

  // Save translation data when onBlur
  const upsertTranslations = (
    translationId: string,
    literalId: string,
    languageId: string,
    translationText: string,
  ): void => {
    const originalTranslation: Translation = translations.find(
      (t: Translation) =>
        t.literal.id === literalId && t.language.id === props.languageId,
    );
    const originalTranslationText: string = originalTranslation
      ? originalTranslation.translation
      : '';
    if (
      translationText !== originalTranslationText // if the text is different to the saved data
    ) {
      upsert({
        variables: {
          where: {
            id: translationId,
          },
          create: {
            translation: translationText,
            language: {
              id: languageId,
            },
            literal: {
              id: literalId,
            },
            project: {
              name: props.projectName,
            },
          },
          update: {
            translation: translationText,
          },
        },
      });
    }
  };

  if (props.newLiteral) {
    props.literalAdded();
    refetch().then(result => {
      if (!result.data) return;
      const { literals, translations } = result.data;
      const lt: LiteralTranslation[] = createLiteralTranslations(
        literals,
        translations,
      );
      setTranslationsState(lt);
    });
  }

  return (
    <div className="Translations">
      {removeLiteralModal ? (
        <Modal
          acceptButtonText="Remove"
          title="Remove literal"
          acceptFunction={() => {
            removeLiteralMutation({
              variables: {
                where: {
                  id: literalIdToRemoveStatus,
                },
              },
            }).then(() => {
              refetch().then(result => {
                if (!result.data) return;
                const { literals, translations } = result.data;
                const lt: LiteralTranslation[] = createLiteralTranslations(
                  literals,
                  translations,
                );
                setTranslationsState(lt);
                setRemoveLiteralModal(false);
              });
            });
          }}
          cancelFunction={() => {
            setRemoveLiteralModal(false);
          }}
        >
          <p>
            Are you sure you want to remove "{literalToRemoveStatus}" literal?
          </p>
        </Modal>
      ) : (
        <></>
      )}
      <div className="filter">
        <input
          value={searchInputState}
          id="input-filter"
          type="text"
          placeholder="Search"
          onChange={event => setSearchInputState(event.target.value)}
          onKeyUp={event => {
            if (event.keyCode === 13) {
              // "enter" key
              props.selectSearch(searchInputState);
              refetch({
                page: 1,
                filter: props.filter,
                search: searchInputState,
              }).then(result => {
                const { literals, translations } = result.data;

                const lt: LiteralTranslation[] = createLiteralTranslations(
                  literals,
                  translations,
                );
                setTranslationsState(lt);
              });
            }
          }}
        />
        <select
          className="select-filter"
          onChange={event => {
            props.selectLiterals(event);
            refetch({
              page: 1,
              filter: +event.target.value,
              search: props.searchValue,
            }).then(result => {
              if (!result.data) return;
              const { literals, translations } = result.data;
              const lt: LiteralTranslation[] = createLiteralTranslations(
                literals,
                translations,
              );
              setTranslationsState(lt);
            });
          }}
          defaultValue={`${props.filter}`}
        >
          <option value={Filter.ALL}>All</option>
          <option value={Filter.TRANSLATED}>Translated</option>
          <option value={Filter.NO_TRANSLATED}>No translated</option>
        </select>
      </div>
      <div className="translation-row header">
        <p className="translation-row__item literal">Literal</p>
        <p className="translation-row__item as-in">As in</p>
        <p className="translation-row__item translation-text">Translation</p>
      </div>
      {translationsState.map((translation: LiteralTranslation) => (
        <TranslationRow
          key={translation.literalId}
          literalId={translation.literalId}
          translationId={translation.translationId}
          literal={translation.literal}
          as_in={translation.as_in}
          translation={translation.translation}
          changeTranslation={changeTranslationValue}
          changeAsIn={changeAsInValue}
          saveTranslation={(
            translationId: string,
            literalId: string,
            translationText: string,
          ) => {
            upsertTranslations(
              translationId,
              literalId,
              props.languageId,
              translationText,
            );
          }}
          saveLiterals={(literalId: string, as_in: string) => {
            updateLiteral(literalId, as_in);
          }}
          removeLiteral={(literalId, literal) => {
            setLiteralIdToRemoveStatus(literalId);
            setLiteralToRemoveStatus(literal);
            setRemoveLiteralModal(true);
          }}
          user={props.user}
        />
      ))}
      <Pagination
        numberPages={pages}
        currentPage={props.page}
        click={props.selectPage}
      />
    </div>
  );
};

export default Translations;
