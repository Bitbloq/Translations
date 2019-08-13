import React from 'react';
import { Link } from 'react-router-dom';
import './ProjectLanguageRow.css';
import PillButton from '../PillButton/PillButton';
import { Language, Project, Translation, Literal } from '../../types';
import Flag from 'react-world-flags';

interface ProjectLanguageRowProps {
  project: Project;
  language: Language;
  allowed: boolean;
}

const projectLanguageRow: React.FC<ProjectLanguageRowProps> = (
  props: ProjectLanguageRowProps,
) => {
  return (
    <div className={'projectLanguageRow ' + (props.allowed ? '' : 'disabled')}>
      <div className="language-project">
        <div>
          <Flag className="flag" code={props.language.code} height="18" />
          <small>{props.language.name}</small>
        </div>
      </div>
      <div className="create-json">
        <PillButton
          text="Create JSON"
          disabled={!props.allowed}
          onClick={() => {
            let i18n: { [key: string]: string } = {};
            props.project.literals.forEach((literal: Literal) => {
              const translation: Translation = props.project.translations.find(
                (translation: Translation) =>
                  translation.language.iso === props.language.iso &&
                  translation.literal.id === literal.id,
              );
              const translationText: string = translation
                ? translation.translation
                : '';
              i18n = { ...i18n, [literal.literal]: translationText };
            });

            const fileName: string = `${props.language.iso}_${props.project.name}.json`;
            console.log(`${fileName}:\n${JSON.stringify(i18n, null, 4)}`);
          }}
        />
      </div>
      <div className="translate">
        <Link
          to={
            props.allowed
              ? `${props.project.name}/translate/${props.language.iso}`
              : '#'
          }
        >
          <PillButton text="Translate" disabled={!props.allowed} />
        </Link>
      </div>
    </div>
  );
};

export default projectLanguageRow;
