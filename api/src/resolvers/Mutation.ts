import * as simplegit from 'simple-git/promise';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import log from '../utils/log';
import { userIsAdmin, userIsAllowed } from '../utils/getUserData';
import {
  LiteralResponse,
  ProjectResponse,
  TranslationResponse,
  UserResponse,
} from '../type-res';

const GIT_USER: string = process.env.GIT_USER;
const GIT_PASS: string = process.env.GIT_PASS;

type i18n = {
  [key: string]: string | i18n;
};

const addLiteral = (
  literal: string,
  translation: string,
  overwrite: boolean,
  projectName: string,
  languageId: string,
  prisma: any,
  headers: any,
) => {
  return new Promise(async (resolve, reject) => {
    const [literalObj] = await prisma.query.literals({
      where: {
        literal,
        project: { name: projectName },
      },
    });
    if (!literalObj) {
      await Mutation.createLiteralTranslation(
        undefined,
        {
          data: {
            language: { id: languageId },
            project: { name: projectName },
            translation,
            literal: {
              literal,
              as_in: translation || literal,
              project: { name: projectName },
            },
          },
        },
        { prisma, headers },
        undefined,
      );
    } else if (literalObj && overwrite) {
      const [translationObj] = await prisma.query.translations({
        where: {
          literal: { literal },
          language: { id: languageId },
          project: { name: projectName },
        },
      });
      await prisma.mutation.upsertTranslation({
        where: {
          id: translationObj ? translationObj.id : '0',
        },
        update: {
          translation,
        },
        create: {
          language: { connect: { id: languageId } },
          project: { connect: { name: projectName } },
          literal: { connect: { id: literalObj.id } },
          translation,
        },
      });
    }
    resolve();
  });
};

const throwError = (message?: string): void => {
  const errorMessage = message || 'Error ocurred.';
  log.error(`${errorMessage}`);
  throw new Error(errorMessage);
};

const createLangJSON = (project, languageIso): i18n => {
  let i18n: i18n = {};
  project.literals.forEach(literal => {
    const translation = project.translations.find(
      translation =>
        translation.language.iso === languageIso &&
        translation.literal.id === literal.id,
    );
    const translationText: string =
      translation && translation.translation
        ? translation.translation
        : literal.literal;
    i18n = { ...i18n, [literal.literal]: translationText };
  });
  return hierarchyJSON(i18n);
};

const hierarchyJSON = (plainFile: i18n): i18n => {
  let file: i18n = {};

  for (let key in plainFile) {
    if (key.match(/\./)) {
      const keysArray: string[] = key.split('.');

      keysArray.forEach((partialKey: string, index: number) => {
        if (file[partialKey]) {
          file[partialKey] = {
            ...(file[partialKey] as i18n),
            ...hierarchyJSON({
              ...(file[partialKey] as i18n),
              [keysArray.splice(1).join('.')]: plainFile[key],
            }),
          };
        } else {
          file[partialKey] = hierarchyJSON({
            [keysArray.splice(1).join('.')]: plainFile[key],
          });
        }
      });
    } else {
      file[key] = plainFile[key];
    }
  }
  return file;
};

const Mutation = {
  async addMainLanguage(parent, { project, main_language }, { prisma, headers }, info) {
    const projectExists: boolean = await prisma.exists.Project({
      name: project.name,
    });
    const languageExists: boolean = await prisma.exists.Language({
      id: main_language,
    });

    if (!projectExists || !languageExists || !userIsAdmin(headers))
      throwError('The language cannot be added to the project.');
    else log.mutation('Mutation: addMainLanguage');

    return await prisma.mutation.updateProject(
      {
        where: {
          name: project.name,
        },
        data: {
          main_language
        },
      },
      ProjectResponse,
    );

  },
  async addLanguageToProject(
    parent,
    { project, language },
    { prisma, headers },
    info,
  ) {
    const projectExists: boolean = await prisma.exists.Project({
      name: project.name,
    });
    const languageExists: boolean = await prisma.exists.Language({
      id: language.id,
    });

    if (!projectExists || !languageExists || !userIsAdmin(headers))
      throwError('The language cannot be added to the project.');
    else log.mutation('Mutation: addLanguageToProject');

    return await prisma.mutation.updateProject(
      {
        where: {
          name: project.name,
        },
        data: {
          languages: {
            connect: { id: language.id },
          },
        },
      },
      ProjectResponse,
    );
  },
  async addLanguageToUser(
    parent,
    { user, language },
    { prisma, headers },
    info,
  ) {
    const userExists: boolean = await prisma.exists.User({
      name: user.name,
    });
    const languageExists: boolean = await prisma.exists.Language({
      id: language.id,
    });

    if (!userExists || !languageExists || !userIsAdmin(headers))
      throwError('The language cannot be added to the user.');
    else log.mutation('Mutation: addLanguageToUser');

    return await prisma.mutation.updateUser(
      {
        where: {
          name: user.name,
        },
        data: {
          languages: {
            connect: { id: language.id },
          },
        },
      },
      UserResponse,
    );
  },
  async addUserToProject(parent, { project, user }, { prisma, headers }, info) {
    const projectExists: boolean = await prisma.exists.Project({
      name: project.name,
    });
    const userExists: boolean = await prisma.exists.User({
      id: user.id,
    });

    if (!projectExists || !userExists || !userIsAdmin(headers))
      throwError('The user cannot be added to the project.');
    else log.mutation('Mutation: addUserToProject');

    prisma.mutation.updateUser({
      where: {
        id: user.id,
      },
      data: {
        projects: {
          connect: {
            name: project.name,
          },
        },
      },
    });

    return await prisma.mutation.updateProject(
      {
        where: {
          name: project.name,
        },
        data: {
          users: {
            connect: { id: user.id },
          },
        },
      },
      ProjectResponse,
    );
  },
  async createProject(parent, { data }, { prisma, headers }, info) {
    if (!userIsAdmin(headers)) {
      throwError('You have to be an admin user.');
    }

    const projectExists: boolean = await prisma.exists.Project({
      name: data.name,
    });

    const newProject = {
      ...data,
      git_repo: data.git_repo.replace(/^https*:\/\//, ''),
      git_path: data.git_path.replace(/^\//, ''),
      users: {
        connect: data.users,
      },
      languages: {
        connect: data.languages,
      },
      main_language: data.languages[0].id,
    };

    if (projectExists) throwError('The name cannot be repeated.');
    else log.mutation('Mutation: createProject');

    return await prisma.mutation.createProject(
      { data: newProject },
      ProjectResponse,
    );
  },
  async createUser(parent, { data }, { prisma }, info) {
    const userExists: boolean = await prisma.exists.User({
      name: data.name,
    });

    if (userExists) throwError('The name cannot be repeated.');
    else if (!data.name) throwError('The name cannot be empty.');
    else if (!data.password) throwError('The password cannot be empty.');
    else if (!data.repeatedPassword)
      throwError('The second password cannot be empty.');
    else if (data.password !== data.repeatedPassword)
      throwError("The passwords don't match.");
    else log.mutation('Mutation: createUser');

    const salt: string = await bcrypt.genSalt(+process.env.SALT || 10);
    const hashPassword: string = await bcrypt.hash(data.password, salt);

    return await prisma.mutation.createUser(
      {
        data: {
          name: data.name,
          password: hashPassword,
        },
      },
      UserResponse,
    );
  },
  async createLiteralTranslation(parent, { data }, { prisma, headers }, info) {
    if (!userIsAdmin(headers)) {
      throwError('You have to be an admin user.');
    }

    const literal: string = data.literal.literal;
    const projectName: string = data.project.name;
    const existsLiteral: boolean = await prisma.exists.Literal({
      literal,
      project: { name: projectName },
    });

    const newTranslation = {
      ...data,
      project: {
        connect: data.project,
      },
      language: {
        connect: data.language,
      },
      literal: {
        create: {
          ...data.literal,
          project: {
            connect: data.literal.project,
          },
        },
      },
    };

    if (existsLiteral) throwError('The literal already exists.');
    else log.mutation('Mutation: createTranslation');

    return await prisma.mutation.createTranslation(
      { data: newTranslation },
      TranslationResponse,
    );
  },
  async importLiterals(
    parent,
    { data, overwrite, project, language },
    { prisma, headers },
    info,
  ) {
    if (!userIsAdmin(headers)) {
      throwError('You have to be an admin user.');
    }

    return Promise.all(
      data.map(item =>
        addLiteral(
          item.literal,
          item.translation,
          overwrite,
          project.name,
          language.id,
          prisma,
          headers,
        ),
      ),
    ).then(() => {
      log.mutation('importLiterals');
      return true;
    });
  },
  async login(parent, { username, password }, { prisma, headers }, info) {
    const user = await prisma.query.user(
      { where: { name: username } },
      '{ admin id password }',
    );

    if (!user) {
      throwError('Incorrect username or password.');
    }

    const correctPassword: boolean = await bcrypt.compare(
      password,
      user.password,
    );

    if (!correctPassword) {
      throwError('Incorrect username or password.');
    }

    log.mutation('Mutation: login');

    const token: string = jwt.sign(
      { id: user.id, admin: user.admin },
      process.env.TOKEN_SECRET,
    );

    return token;
  },
  async pushTranslations(
    parent,
    { project, language },
    { prisma, headers },
    info,
  ) {
    if (!userIsAdmin(headers)) {
      throwError('You have to be an admin user.');
    }

    const projectExists: boolean = await prisma.exists.Project({
      name: project.name,
    });

    if (!projectExists) throwError("The project doesn't exist.");
    else log.mutation('Mutation: pushTranslations');

    project = await prisma.query.project(
      { where: { name: project.name } },
      ProjectResponse,
    );
    const { git_repo, git_name, git_branch, git_path } = project;

    const git = simplegit();

    const path: string = `/tmp/${git_name}`;
    const remote: string = `https://${GIT_USER}:${GIT_PASS}@${git_repo}`;

    if (fs.existsSync(path)) {
      fs.rmdirSync(path);
    }

    try {
      await git.clone(remote, path, [
        '--single-branch',
        '--branch',
        git_branch,
      ]);
    } catch (e) {
      throwError('Clone error');
    }

    const languages = language ? [language] : project.languages;

    await git.cwd(path);

    languages.forEach(async lang => {
      fs.writeFileSync(`${path}/${git_path}/${lang.iso}.json`, JSON.stringify(createLangJSON(project, lang.iso), null, 2));
      await git.add(`${git_path}/${lang.iso}.json`);
    });

    await git.commit(`Adds new ${language ? language.iso : ''} translations`);
    await git.push('origin', git_branch);

    fs.rmdirSync(path);

    return true;
  },
  async removeLanguageFromProject(
    parent,
    { project, language },
    { prisma, headers },
    info,
  ) {
    const projectExists: boolean = await prisma.exists.Project({
      name: project.name,
    });
    const languageExists: boolean = await prisma.exists.Language({
      id: language.id,
    });

    if (!projectExists || !languageExists || !userIsAdmin(headers))
      throwError('The language cannot be removed from the project.');
    else log.mutation('Mutation: removeLanguageFromProject');

    prisma.mutation.deleteManyTranslations({
      where: {
        project: {
          name: project.name,
        },
        language: {
          id: language.id,
        },
      },
    });

    return await prisma.mutation.updateProject(
      {
        where: {
          name: project.name,
        },
        data: {
          languages: {
            disconnect: { id: language.id },
          },
        },
      },
      ProjectResponse,
    );
  },
  async removeLanguageFromUser(
    parent,
    { user, language },
    { prisma, headers },
    info,
  ) {
    const userExists: boolean = await prisma.exists.User({
      name: user.name,
    });
    const languageExists: boolean = await prisma.exists.Language({
      id: language.id,
    });

    if (!userExists || !languageExists || !userIsAdmin(headers))
      throwError('The language cannot be removed from the user.');
    else log.mutation('Mutation: removeLanguageFromUser');

    return await prisma.mutation.updateUser(
      {
        where: {
          name: user.name,
        },
        data: {
          languages: {
            disconnect: { id: language.id },
          },
        },
      },
      UserResponse,
    );
  },
  async removeLiteral(parent, where, { prisma, headers }, info) {
    const literalExists: boolean = await prisma.exists.Literal({
      id: where.id,
    });

    if (!literalExists || !userIsAdmin(headers))
      throwError('The literal cannot be removed.');
    else log.mutation('Mutation: removeLanguageFromUser');

    return await prisma.mutation.deleteLiteral(where, LiteralResponse);
  },
  async removeUserFromProject(parent, { project, user }, { prisma, headers }, info) {
    const projectExists: boolean = await prisma.exists.Project({
      name: project.name,
    });
    const userExists: boolean = await prisma.exists.User({
      id: user.id,
    });

    if (!projectExists || !userExists || !userIsAdmin(headers))
      throwError('The user cannot be removed from the project.');
    else log.mutation('Mutation: removeUserFromProject');

    prisma.mutation.updateUser({
      where: {
        id: user.id,
      },
      data: {
        projects: {
          disconnect: {
            name: project.name,
          },
        },
      },
    });

    return await prisma.mutation.updateProject(
      {
        where: {
          name: project.name,
        },
        data: {
          users: {
            disconnect: { id: user.id },
          },
        },
      },
      ProjectResponse,
    );
  },
  async setAdminUser(
    parent,
    { userId, admin },
    { prisma, headers },
    info
  ) {
    const userExists: boolean = await prisma.exists.User({
      id: userId,
    });
    if (!userExists && !userIsAdmin(headers))
      throwError('The user can be admin.');
    else log.mutation('Mutation: setAdminUser');

    return await prisma.mutation.updateUser(
      {
        where: {
          id: userId,
        },
        data: {
          admin
        },
      },
      UserResponse,
    );
  },
  async upsertTranslation(
    parent,
    { where, create, update },
    { prisma, headers },
    info,
  ) {
    const languageId: string = create.language.id;
    const literalId: string = create.literal.id;
    const projectName: string = create.project.name;

    const projectAllowed: boolean = await userIsAllowed(
      prisma,
      headers,
      'projects',
      'name',
      projectName,
    );
    const languagesAllowed: boolean = await userIsAllowed(
      prisma,
      headers,
      'languages',
      'id',
      languageId,
    );
    const translationExists: boolean = await prisma.exists.Translation(where);

    if (!projectAllowed || !languagesAllowed) {
      throwError("You don't have permissions.");
    }

    if (!translationExists) {
      const languageExists: boolean = await prisma.exists.Language({
        id: languageId,
      });
      const literalExists: boolean = await prisma.exists.Literal({
        id: literalId,
        project: { name: projectName },
      });
      const projectExists: boolean = await prisma.exists.Project({
        name: projectName,
      });

      if (!languageExists || !literalExists || !projectExists)
        throwError("It can't connect with the requiered elements.");
    }

    const newTranslation = {
      ...create,
      project: {
        connect: create.project,
      },
      language: {
        connect: create.language,
      },
      literal: {
        connect: create.literal,
      },
    };

    log.mutation('Mutation: upsertTranslation');

    return await prisma.mutation.upsertTranslation({
      where,
      create: newTranslation,
      update,
    });
  },
  async updateLiteral(parent, { data, where }, { prisma, headers }, info) {
    if (!userIsAdmin(headers)) {
      throwError('You have to be an admin user.');
    }

    const literalExists: boolean = prisma.exists.Literal(where);

    if (!literalExists) {
      throwError("The literal doesn't exist.");
    }

    log.mutation('Mutation: updateLiteral');

    return await prisma.mutation.updateLiteral({ where, data });
  },
};

export { Mutation as default };
